#include <Arduino.h>
#include <WiFi.h>
#include "driver/i2s.h"
#include "config.h"

void initAudio() {
    i2s_config_t cfg = {
        .mode               = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
        .sample_rate        = AUDIO_SAMPLE_RATE,
        .bits_per_sample    = I2S_BITS_PER_SAMPLE_16BIT,
        .channel_format     = I2S_CHANNEL_FMT_ONLY_LEFT,
        .communication_format = I2S_COMM_FORMAT_STAND_I2S,
        .intr_alloc_flags   = ESP_INTR_FLAG_LEVEL1,
        .dma_buf_count      = 8,
        .dma_buf_len        = 256,
        .use_apll           = false,
        .tx_desc_auto_clear = true,
        .fixed_mclk         = 0
    };
    i2s_pin_config_t pins = {
        .bck_io_num   = I2S_BCLK_PIN,
        .ws_io_num    = I2S_LRCLK_PIN,
        .data_out_num = I2S_DOUT_PIN,
        .data_in_num  = I2S_PIN_NO_CHANGE
    };

    i2s_driver_install(I2S_PORT, &cfg, 0, NULL);
    i2s_set_pin(I2S_PORT, &pins);
    i2s_zero_dma_buffer(I2S_PORT);
    Serial.println("[Audio] I2S initialized");
}

void playTTSAudio(const String& url) {
    if (!url.startsWith("http://")) {
        Serial.println("[Audio] Only http:// supported");
        return;
    }

    int schemeEnd = url.indexOf("://");
    int pathStart = url.indexOf('/', schemeEnd + 3);
    if (pathStart < 0) {
        Serial.println("[Audio] Invalid URL");
        return;
    }

    String hostPort = url.substring(schemeEnd + 3, pathStart);
    String path     = url.substring(pathStart);
    String host     = hostPort;
    int    port     = 80;

    int colon = hostPort.indexOf(':');
    if (colon >= 0) {
        host = hostPort.substring(0, colon);
        port = hostPort.substring(colon + 1).toInt();
        if (port == 0) port = 80;
    }

    WiFiClient client;
    if (!client.connect(host.c_str(), port)) {
        Serial.println("[Audio] HTTP connect failed");
        return;
    }

    client.print("GET " + path + " HTTP/1.1\r\nHost: " + host + "\r\nConnection: close\r\n\r\n");

    // HTTP 헤더 스킵
    while (client.connected()) {
        String line = client.readStringUntil('\n');
        if (line == "\r" || line.length() <= 1) break;
    }

    // WAV 헤더(44바이트) 수신
    uint8_t      wavHeader[44];
    int          bytesRead = 0;
    unsigned long t0       = millis();
    while (bytesRead < 44) {
        if (!client.available()) {
            if (millis() - t0 > 2000) { client.stop(); return; }
            delay(1);
            continue;
        }
        int n = client.read(wavHeader + bytesRead, 44 - bytesRead);
        if (n > 0) bytesRead += n;
    }

    uint32_t sampleRate = wavHeader[24] | (wavHeader[25] << 8) |
                          (wavHeader[26] << 16) | (wavHeader[27] << 24);
    i2s_set_sample_rates(I2S_PORT, sampleRate);

    Serial.println("[Audio] Streaming...");
    uint8_t buf[512];
    while (client.connected() || client.available()) {
        int n = client.read(buf, sizeof(buf));
        if (n <= 0) { delay(1); continue; }
        size_t written = 0;
        i2s_write(I2S_PORT, buf, n, &written, portMAX_DELAY);
    }

    client.stop();
    Serial.println("[Audio] Done");
}
