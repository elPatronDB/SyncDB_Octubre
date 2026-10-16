import { AcousticInMemoryStore } from "../infrastructure/acoustic-in-memory.store.js";
import type { AcousticFrame } from "../domain/acoustic.entity.js";
import type { DeviceEntity } from "../domain/device.entity.js";

function assert(condition: boolean, msg: string) {
    if (!condition) {
        throw new Error(`Assertion failed: ${msg}`);
    }
}

async function runTests() {
    console.log("=== INICIANDO PRUEBAS DE ANÁLISIS ACÚSTICO Y AGREGACIÓN ===");

    const store = AcousticInMemoryStore.getInstance();
    const projectId = "test-project-123";

    const dev1: DeviceEntity = {
        id: "dev-1",
        projectId,
        socketId: null,
        browserIdentifier: "browser-1",
        deviceToken: "token-1",
        name: "iPhone Probe 1",
        role: "PROBE",
        isAnchor: false,
        status: "CONNECTED",
        deviceModel: "iPhone 15",
        browserInfo: "Safari",
        positionX: 0,
        positionY: 0,
        positionZ: 0,
        latitude: null,
        longitude: null,
        accuracy: null,
        altitude: null,
        hasLocationPermission: false,
        lastLocationAt: null,
        ipAddress: null,
        calibrationOffsetDb: 0,
        lastSeenAt: new Date(),
        joinedAt: new Date(),
        updatedAt: new Date(),
    };

    const dev2: DeviceEntity = {
        ...dev1,
        id: "dev-2",
        browserIdentifier: "browser-2",
        deviceToken: "token-2",
        name: "Android Probe 2",
        calibrationOffsetDb: 5.0, // Calibrated with +5 dB offset
    };

    // Test 1: Single device frame processing
    console.log("Test 1: Procesamiento de trama acústica de dispositivo 1...");
    const frame1: AcousticFrame = {
        deviceId: dev1.id,
        projectId,
        timestamp: Date.now(),
        sampleRate: 48000,
        nyquist: 24000,
        fftSize: 2048,
        rmsDb: -24.0,
        splDb: null,
        peakFreq: 1000,
        bands: new Array(31).fill(-30.0),
        spectrum: new Array(64).fill(-30.0),
        isCalibrated: false,
        calibrationOffsetDb: 0,
        isMicActive: true,
    };
    frame1.bands[17] = -15.0; // 1000 Hz peak

    store.updateDeviceFrame(frame1, dev1);

    const snapshot1 = store.getSnapshot(projectId);
    assert(snapshot1.aggregate.activeDeviceCount === 1, "Debe haber 1 dispositivo activo");
    assert(snapshot1.devices.length === 1, "Debe haber 1 dispositivo en memoria");
    assert(Math.abs(snapshot1.aggregate.currentSpectrum[17]! - (-15.0)) < 0.1, "Banda de 1000Hz debe coincidir");
    console.log("✓ Test 1 Pasó exitosamente.");

    // Test 2: Energy Averaging across multiple devices
    console.log("Test 2: Promedio energético entre múltiples dispositivos...");
    // If dev1 has -20 dBFS and dev2 has -14 dBFS in a band:
    // Power1 = 10^(-2) = 0.01, Power2 = 10^(-1.4) = 0.0398
    // Mean Power = (0.01 + 0.0398)/2 = 0.0249
    // L_prom = 10 * log10(0.0249) = -16.03 dB
    const frame2: AcousticFrame = {
        deviceId: dev2.id,
        projectId,
        timestamp: Date.now(),
        sampleRate: 44100,
        nyquist: 22050,
        fftSize: 2048,
        rmsDb: -18.0,
        splDb: 76.0,
        peakFreq: 1000,
        bands: new Array(31).fill(-20.0),
        spectrum: new Array(64).fill(-20.0),
        isCalibrated: true,
        calibrationOffsetDb: 5.0,
        isMicActive: true,
    };
    frame1.bands[10] = -20.0;
    frame2.bands[10] = -14.0;

    store.updateDeviceFrame(frame2, dev2);
    const snapshot2 = store.getSnapshot(projectId);

    assert(snapshot2.aggregate.activeDeviceCount === 2, "Debe haber 2 dispositivos contribuyendo");
    const aggregatedBand10 = snapshot2.aggregate.currentSpectrum[10]!;
    const expectedEnergyAvg = 10 * Math.log10((Math.pow(10, -20 / 10) + Math.pow(10, -14 / 10)) / 2);
    assert(Math.abs(aggregatedBand10 - expectedEnergyAvg) < 0.2, `El promedio energético debe ser ${expectedEnergyAvg.toFixed(2)}, pero fue ${aggregatedBand10.toFixed(2)}`);
    console.log(`✓ Test 2 Pasó: Promedio energético calculado: ${aggregatedBand10.toFixed(2)} dBFS (Esperado: ${expectedEnergyAvg.toFixed(2)} dBFS)`);

    // Test 3: Recommendations generation
    console.log("Test 3: Generación de recomendaciones acústicas PA...");
    // Introduce an artificial narrow resonant peak at 250 Hz (index 9)
    frame1.bands[9] = -6.0;
    frame2.bands[9] = -7.0;
    store.updateDeviceFrame(frame1, dev1);
    store.updateDeviceFrame(frame2, dev2);

    const snapshot3 = store.getSnapshot(projectId);
    console.log("Recomendaciones generadas:", snapshot3.aggregate.recommendations.map(r => `${r.filterType} en ${r.centerFreq}Hz: ${r.gainDb}dB (${r.reason})`));
    assert(snapshot3.aggregate.recommendations.length > 0, "Debe generar al menos una recomendación de ecualización");
    const peakRec = snapshot3.aggregate.recommendations.find(r => r.centerFreq === 250 || r.centerFreq === 1000);
    assert(!!peakRec, "Debe detectar el pico modal");
    console.log("✓ Test 3 Pasó exitosamente.");

    // Test 4: Peak hold independence
    console.log("Test 4: Curva de máximos (Peak Hold) independiente...");
    const initialPeakBand9 = snapshot3.devices[0]!.peakHoldCurve[9]!;
    // Send a lower frame now
    frame1.bands[9] = -35.0;
    store.updateDeviceFrame(frame1, dev1);
    const snapshot4 = store.getSnapshot(projectId);
    assert(snapshot4.devices[0]!.peakHoldCurve[9]! >= initialPeakBand9, "El pico retenido no debe disminuir ante una señal más baja");
    console.log("✓ Test 4 Pasó exitosamente.");

    // Test 5: Mic inactive exclusion
    console.log("Test 5: Exclusión de dispositivo con micrófono inactivo...");
    frame2.isMicActive = false;
    store.updateDeviceFrame(frame2, dev2);
    const snapshot5 = store.getSnapshot(projectId);
    assert(snapshot5.aggregate.activeDeviceCount === 1, "Solo 1 dispositivo debe contribuir al desactivar micrófono");
    console.log("✓ Test 5 Pasó exitosamente.");

    console.log("=== TODAS LAS PRUEBAS DE BACKEND PASARON EXITOSAMENTE ===");
}

runTests().catch(err => {
    console.error("Error en pruebas:", err);
    process.exit(1);
});
