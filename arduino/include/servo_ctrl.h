#pragma once

void initServo();
void openUmbrella(long closeInMs);
void closeUmbrella();
bool isUmbrellaOpen();

// loop()에서 자동 닫힘 타이머 체크. 닫혀야 할 시각이면 true 반환.
bool checkAutoClose(unsigned long now);
