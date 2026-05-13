#pragma once
#include <Arduino.h>

void initLCD();
void lcdClear();
void lcdWrite(uint8_t col, uint8_t row, const String& text);

// 최대 32자 텍스트를 16자씩 두 줄로 나눠 출력
void showTextOnLCD(const String& text);
