#pragma once
#include <Arduino.h>

void initAudio();

// http:// URL에서 WAV를 스트리밍해 I2S(MAX98357)로 재생
void playTTSAudio(const String& url);
