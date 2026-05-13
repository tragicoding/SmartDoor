#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "lcd_display.h"

static LiquidCrystal_I2C lcd(0x27, 16, 2);

void initLCD() {
    Wire.begin();
    lcd.init();
    lcd.backlight();
    lcd.clear();
    Serial.println("[LCD] Initialized");
}

void lcdClear() {
    lcd.clear();
}

void lcdWrite(uint8_t col, uint8_t row, const String& text) {
    lcd.setCursor(col, row);
    lcd.print(text);
}

void showTextOnLCD(const String& text) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(text.substring(0, 16));
    if (text.length() > 16) {
        lcd.setCursor(0, 1);
        lcd.print(text.substring(16, 32));
    }
}
