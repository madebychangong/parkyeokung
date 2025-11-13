// ===== 설정 값 =====
const CONFIG = {
  SHEET_NAMES: {
    STAFF: '담당자관리',
    SCHEDULE: '일정관리',
    PAYMENT: '결제창관리',
    STATS: '통계 뷰어',        
    BACKUP: '데이터백업'    
  },

  SCHEDULE_COLS: {
    START_DATE: 1,      // A열 - 시작일
    END_DATE: 2,        // B열 - 종료일
    ROUND: 3,           // C열 - 차수 (1차, 2차 등)
    TITLE: 4,           // D열 - 일정명
    PERCENT: 5,         // E열 - 퍼센트 (17% 등)
    STAFF: 6,           // F열 - 담당자
    CONTENT: 7,         // G열 - 내용
    PAYMENT_DONE: 8,    // H열 - 결제완료 (읽기전용)
    STATUS: 9,          // I열 - 상태 (신규/수정/완료)
    // J열 - 비고란
    STAFF_CHANGED: 11,  // K열 - 담당자변경 체크
    CANCELLED: 12,      // L열 - 일정취소
    PERSONAL_EVENT_ID: 13,  // M열 - 개인 캘린더
    OLD_STAFF: 14       // N열 - (사용안함: 결제창관리에서 이전담당자 찾음)
  },

  PAYMENT_COLS: {
    TRANSFER: 1,        // A열 - 결제창 전달
    COMPLETE: 2,        // B열 - 결제완료
    DATE: 3,            // C열 - 날짜
    TITLE: 4,           // D열 - 일정명
    STAFF: 5,           // E열 - 담당자
    PERSONAL_EVENT_ID: 6  // F열 - 개인 캘린더 이벤트ID
  },

  STAFF_COLS: {
    NAME: 1,
    EMAIL: 2,
    COLOR: 3,
    ACTIVE: 4,
    PERSONAL_CAL: 5,
    RESYNC: 6           // F열 - 재공유 체크박스
  },

  WARNING_COLOR: '#ffff00'
};

// ===== 스프레드시트 열릴 때 메뉴 추가 =====
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📅 메뉴')
    .addItem('👥 담당자 등록 완료', 'setupNewStaff')
    .addItem('🔄 캘린더 공유 재시도', 'resyncCalendarSharing')
    .addSeparator()
    .addItem('🔄 드롭다운 새로고침', 'updateStaffDropdown')
    .addItem('🔄 캘린더 동기화', 'syncAll')
    .addSeparator()
    .addItem('📘 사용 설명서', 'showHelp')
    .addItem('⚙️ 시스템 점검', 'systemCheck')
    .addToUi();
}

// ===== UI: 사용 설명서 =====
function showHelp() {
  const ui = SpreadsheetApp.getUi();
  const helpText =
    '📘 일정 관리 시스템 사용법\n\n' +

    '【담당자 등록하기】\n' +
  
    '1. 담당자관리 시트에 담당자 정보(성함,이메일) 입력\n' +
    '2. 메뉴 → "담당자 등록 완료" 클릭\n' +
    '   → 개인 캘린더 생성\n' +
    '   → 스프레드시트 편집 권한 부여\n' +
    '   → 모든 캘린더 공유\n' +
    '3. 메뉴 → "드롭다운 새로고침" 클릭 -> 일정관리 담당자 목록 업데이트\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '【일정 등록하기】\n' +

    '1. 일정관리 시트에 일정 입력 (필수: A~E열)\n' +
    '2. H열(상태) = "신규" 입력\n' +
    '3. 메뉴 → "캘린더 동기화" 클릭\n' +
    '4. L열에 캘린더ID 생성 → 캘린더 등록 완료!\n' +
    '5. 결제창관리 시트에도 자동 추가됨\n\n' +
    '  ⚠️ H열 "완료" = 동기화 안 됨 (K열 취소 체크도 동기화 안 됨)\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '【일정 수정하기】\n' +

    '1. 일정 내용 수정 (A~G열)\n' +
    '2. H열(상태) = "수정" 입력\n' +
    '3. 메뉴 → "캘린더 동기화" 클릭\n' +
    '4. 캘린더 자동 업데이트!\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '【일정 삭제하기】\n' +

    '1. K열(일정취소) 체크\n' +
    '2. H열(상태) = "수정" 입력\n' +
    '3. 메뉴 → "캘린더 동기화" 클릭\n' +
    '4. 캘린더 일정 자동 삭제!\n' +
    '5. L열 캘린더ID 자동 삭제됨\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '【결제 처리하기】\n' +

    '1. 결제창관리 시트로 이동\n' +
    '2. A열(결제창 전달) + B열(결제완료) 둘 다 체크\n' +
    '3. 일정관리 시트 G열(결제완료)에 자동 체크됨\n' +
    '4. H열(상태) = "수정" 입력\n' +
    '5. 메뉴 → "캘린더 동기화" 클릭\n' +
    '6. 캘린더 제목에 [결완] 자동 표시!\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '【담당자 변경하기】\n' +

    '1. E열(담당자)을 새 담당자로 변경\n' +
    '2. J열(담당자변경) 체크\n' +
    '3. H열(상태) = "수정" 입력\n' +
    '4. 메뉴 → "캘린더 동기화" 클릭\n' +
    '5. 이전 담당자 캘린더에서 자동 삭제\n' +
    '6. 새 담당자 캘린더에 자동 생성\n' +
    '7. J열 자동 체크 해제됨\n\n' +
    '  ⚠️ E열과 J열 순서는 상관없음 (어떤 순서든 OK)\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '【📧 캘린더 공유 재시도】\n' +
    '\n' +
    '🔹 언제 사용하나요?\n' +
    '  • 새 담당자 추가 시 초대 메일을 못 받은 경우\n' +
    '  • 공유 중 오류가 발생한 경우\n' +
    '  • 캘린더가 보이지 않는 담당자가 있는 경우\n\n' +
    '🔹 사용 방법:\n' +
    '  1. 담당자관리 시트로 이동\n' +
    '  2. F열(재공유)에 문제 생긴 담당자만 체크 ✓\n' +
    '  3. 메뉴 → "캘린더 공유 재시도" 클릭\n' +
    '  4. 확인 팝업에서 [예] 클릭\n' +
    '  5. 체크된 담당자에게만 캘린더 재공유!\n' +
    '  6. 모든 담당자에게 초대 메일 재발송됨\n' +
    '  7. 완료 후 체크박스 자동 해제됨\n\n' +
    '🔹 효율성:\n' +
    '  • 1명 체크 시: 약 35초 (116번 API 호출)\n' +
    '  • 3명 체크 시: 약 1분 45초 (348번 API 호출)\n' +
    '  • 전체 재공유 대비 5~15배 빠름!\n\n' +
    '🔹 주의사항:\n' +
    '  • 반드시 문제 생긴 사람만 체크하세요\n' +
    '  • 전체 체크 시 시간이 오래 걸릴 수 있음\n' +
    '  • 이메일에서 초대를 수락해야 캘린더에 추가됨\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '【⚠️ 주의사항】\n' +

    '• H열(상태) 필수: "신규", "수정" 입력 시만 동기화됨\n' +
    '• H열 "완료" = 동기화 건너뜀 (K열 취소 체크도 건너뜀)\n' +
    '• L열(캘린더ID)은 자동 입력 → 절대 수정 금지!\n' +
    '• M열은 사용 안 함 (이전담당자는 결제창관리에서 자동 감지)\n' +
    '• 오류 발생 시: 로그에 행번호+제목 표시 → 해당 행 확인\n' +
    '• 문제 발생 시 → "시스템 점검" 확인\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '【데이터집계 및 백업 안내】\n' +

    '• 통계뷰어는 최근 3개월 일정 자동 표시\n' +
    '• 매달 1일, 두달전 일정은 자동 백업\n' +
    '• 약 10분마다 자동 갱신\n' +
    '• 데이터시트는 수정 금지\n';

  ui.alert('📘 사용 설명서', helpText, ui.ButtonSet.OK);
}

// ===== UI: 시스템 점검 =====
function systemCheck() {
  const ui = SpreadsheetApp.getUi();

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let report = '⚙️ 시스템 점검 결과\n\n';

    const scheduleSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SCHEDULE);
    const staffSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.STAFF);
    const paymentSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PAYMENT);

    report += scheduleSheet ? '✅ 일정관리 시트: 정상\n' : '❌ 일정관리 시트: 없음\n';
    report += staffSheet ? '✅ 담당자관리 시트: 정상\n' : '❌ 담당자관리 시트: 없음\n';
    report += paymentSheet ? '✅ 결제창관리 시트: 정상\n' : '❌ 결제창관리 시트: 없음\n';

    if (staffSheet) {
      const staffData = staffSheet.getDataRange().getValues();
      let activeCount = 0;
      let personalCalCount = 0;

      for (let i = 1; i < staffData.length; i++) {
        const isActive = staffData[i][CONFIG.STAFF_COLS.ACTIVE - 1];
        const personalCal = staffData[i][CONFIG.STAFF_COLS.PERSONAL_CAL - 1];

        if (isActive === true) {
          activeCount++;
          if (personalCal) {
            personalCalCount++;
          }
        }
      }

      report += '\n【담당자 현황】\n';
      report += '활성 담당자: ' + activeCount + '명\n';
      report += '개인 캘린더: ' + personalCalCount + '/' + activeCount + '개\n';
    }

    if (scheduleSheet) {
      const scheduleData = scheduleSheet.getDataRange().getValues();
      let totalSchedules = 0;
      let withEventId = 0;
      let cancelled = 0;

      for (let i = 1; i < scheduleData.length; i++) {
        const startDate = scheduleData[i][CONFIG.SCHEDULE_COLS.START_DATE - 1];
        const endDate = scheduleData[i][CONFIG.SCHEDULE_COLS.END_DATE - 1];
        const title = scheduleData[i][CONFIG.SCHEDULE_COLS.TITLE - 1];
        const staff = scheduleData[i][CONFIG.SCHEDULE_COLS.STAFF - 1];

        if (startDate && endDate && title && staff) {
          totalSchedules++;

          const eventId = scheduleData[i][CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID - 1];
          if (eventId) {
            withEventId++;
          }

          const isCancelled = scheduleData[i][CONFIG.SCHEDULE_COLS.CANCELLED - 1];
          if (isCancelled === true) {
            cancelled++;
          }
        }
      }

      report += '\n【일정 현황】\n';
      report += '전체 일정: ' + totalSchedules + '개\n';
      report += '캘린더 연동: ' + withEventId + '개\n';
      report += '취소된 일정: ' + cancelled + '개\n';
      report += '미연동 일정: ' + (totalSchedules - withEventId - cancelled) + '개\n';
    }

    report += '\n💡 미연동 일정이 있다면 "캘린더 동기화"를 실행하세요.';

    ui.alert('⚙️ 시스템 점검', report, ui.ButtonSet.OK);
    Logger.log('✅ 시스템 점검 완료');

  } catch(e) {
    ui.alert('❌ 오류', '시스템 점검 실패: ' + e.message, ui.ButtonSet.OK);
    Logger.log('❌ 시스템 점검 오류: ' + e.message);
  }
}

// ===== 담당자 등록 완료 (통합 함수) =====
function setupNewStaff() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    '👥 담당자 등록 완료',
    '담당자관리 시트에서 새로 추가된 담당자를 확인하고\n다음 작업을 자동으로 수행합니다:\n\n' +
    '✅ 개인 캘린더 생성\n' +
    '✅ 스프레드시트 편집 권한 부여\n' +
    '✅ 모든 개인 캘린더 공유\n\n' +
    '계속하시겠습니까?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const staffSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.STAFF);
  const staffData = staffSheet.getDataRange().getValues();

  let calendarCreated = 0;
  let permissionGranted = 0;
  let calendarShared = 0;
  let skipped = 0;
  let errors = 0;
  const errorMessages = [];

  try {
    // 기존 모든 캘린더 ID 목록 가져오기
    const existingCalendars = [];
    for (let i = 1; i < staffData.length; i++) {
      const isActive = staffData[i][CONFIG.STAFF_COLS.ACTIVE - 1];
      const personalCalId = staffData[i][CONFIG.STAFF_COLS.PERSONAL_CAL - 1];
      
      if (isActive === true && personalCalId) {
        existingCalendars.push(personalCalId);
      }
    }

    // 담당자 처리
    for (let i = 1; i < staffData.length; i++) {
      const name = staffData[i][CONFIG.STAFF_COLS.NAME - 1];
      const email = (staffData[i][CONFIG.STAFF_COLS.EMAIL - 1] || '').toString().trim();
      const isActive = staffData[i][CONFIG.STAFF_COLS.ACTIVE - 1];
      const existingCalId = staffData[i][CONFIG.STAFF_COLS.PERSONAL_CAL - 1];

      if (!name || !email || isActive !== true) {
        continue;
      }

      // 1️⃣ 개인 캘린더 생성 (없는 경우만)
      let personalCalId = existingCalId;
      
      if (!existingCalId) {
        try {
          const calendarName = `개인 일정 - ${name}`;
          const calendar = CalendarApp.createCalendar(calendarName);

          const colorCode = staffData[i][CONFIG.STAFF_COLS.COLOR - 1];
          if (colorCode) {
            calendar.setColor(colorCode.toString());
          }

          personalCalId = calendar.getId();
          staffSheet.getRange(i + 1, CONFIG.STAFF_COLS.PERSONAL_CAL).setValue(personalCalId);
          
          calendarCreated++;
          Logger.log('✅ 개인 캘린더 생성: ' + name);
          
          Utilities.sleep(1000);
          
        } catch(createError) {
          Logger.log('❌ 캘린더 생성 오류 (' + name + '): ' + createError.message);
          errorMessages.push(`${name}: 캘린더 생성 실패`);
          errors++;
          continue;
        }
      } else {
        skipped++;
        Logger.log('⏭️ 개인 캘린더 이미 존재: ' + name);
      }

      // 2️⃣ 스프레드시트 편집 권한 부여
      try {
        const editors = ss.getEditors().map(e => e.getEmail());
        
        if (!editors.includes(email)) {
          ss.addEditor(email);
          permissionGranted++;
          Logger.log('✅ 스프레드시트 편집 권한 부여: ' + email);
        } else {
          Logger.log('⏭️ 이미 편집자: ' + email);
        }
      } catch(permError) {
        Logger.log('⚠️ 편집 권한 부여 실패 (' + email + '): ' + permError.message);
        errorMessages.push(`${name}: 편집 권한 부여 실패`);
      }

      // 3️⃣ 담당자 본인 캘린더에 owner 권한 (캘린더 새로 생성한 경우만)
      if (personalCalId && !existingCalId) {
        try {
          Calendar.Acl.insert({
            role: 'owner',
            scope: {
              type: 'user',
              value: email
            }
          }, personalCalId);
          Logger.log('✅ 본인 캘린더 owner 권한: ' + email);
          Utilities.sleep(300);  // API 제한 방지
        } catch(shareError) {
          // "Cannot change your own access level"은 정상 (무시)
          if (!shareError.message.includes('Cannot change')) {
            Logger.log('⚠️ 본인 캘린더 공유 실패: ' + email + ' - ' + shareError.message);
          }
        }
      }

      // 4️⃣ 모든 기존 캘린더를 이 담당자에게 공유 (모든 활성 담당자)
      if (existingCalendars.length > 0) {
        existingCalendars.forEach(calId => {
          if (calId !== personalCalId) {  // 본인 캘린더 제외
            try {
              Calendar.Acl.insert({
                role: 'owner',
                scope: {
                  type: 'user',
                  value: email
                }
              }, calId);
              calendarShared++;
              Logger.log(`✅ 기존 캘린더 공유 (${email}에게): ${calId}`);
              Utilities.sleep(300);  // API 제한 방지
            } catch(shareErr) {
              // "User already has access" 또는 Rate Limit 등은 로그만 출력
              if (!shareErr.message.includes('already has access')) {
                Logger.log(`⚠️ 기존 캘린더 공유 실패: ${shareErr.message}`);
              }
            }
          }
        });
      }

      // 5️⃣ 이 담당자의 캘린더를 모든 다른 담당자에게 공유 (모든 활성 담당자)
      if (personalCalId) {
        for (let j = 1; j < staffData.length; j++) {
          if (j === i) continue;  // 본인 제외

          const otherEmail = staffData[j][CONFIG.STAFF_COLS.EMAIL - 1];
          const otherActive = staffData[j][CONFIG.STAFF_COLS.ACTIVE - 1];

          if (otherEmail && otherActive === true) {
            // 이메일 공백 제거
            const cleanEmail = otherEmail.trim();
            if (!cleanEmail) continue;

            try {
              Calendar.Acl.insert({
                role: 'owner',
                scope: {
                  type: 'user',
                  value: cleanEmail
                }
              }, personalCalId);
              Logger.log(`✅ 캘린더 공유 (${cleanEmail}에게): ${name}`);
              Utilities.sleep(300);  // API 제한 방지
            } catch(shareErr) {
              // "Cannot change your own access level" 또는 "already has access"는 무시
              if (!shareErr.message.includes('Cannot change') &&
                  !shareErr.message.includes('already has access')) {
                Logger.log(`⚠️ 캘린더 공유 실패 (${cleanEmail}): ${shareErr.message}`);
              }
            }
          }
        }
      }
    }

    // 결과 메시지
    let message = '✅ 담당자 등록 완료!\n\n';
    message += `【처리 결과】\n`;
    message += `• 개인 캘린더 생성: ${calendarCreated}개\n`;
    message += `• 캘린더 건너뜀: ${skipped}개\n`;
    message += `• 스프레드시트 권한 부여: ${permissionGranted}명\n`;
    message += `• 캘린더 공유: ${calendarShared}건\n`;

    if (errors > 0) {
      message += `\n【오류】\n`;
      errorMessages.forEach(msg => {
        message += `⚠️ ${msg}\n`;
      });
    }

    message += '\n📧 각 담당자는 이메일에서 초대를 수락해주세요!';
    message += '\n💡 이제 "드롭다운 새로고침"을 실행하세요.';

    ui.alert('✅ 완료', message, ui.ButtonSet.OK);
    Logger.log('✅ 담당자 등록 완료');

  } catch(e) {
    ui.alert('❌ 오류', '담당자 등록 중 오류 발생: ' + e.message, ui.ButtonSet.OK);
    Logger.log('❌ 담당자 등록 오류: ' + e.message);
  }
}

// ===== 캘린더 공유 재시도 (체크된 담당자만 선택적 재공유) =====
function resyncCalendarSharing() {
  const ui = SpreadsheetApp.getUi();

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const staffSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.STAFF);

    if (!staffSheet) {
      ui.alert('❌ 오류', '담당자 시트를 찾을 수 없습니다.', ui.ButtonSet.OK);
      return;
    }

    const staffData = staffSheet.getDataRange().getValues();

    // 활성 담당자 목록 (이메일, 이름, 캘린더ID, 행번호)
    const activeStaff = [];
    const resyncStaff = [];  // 재공유 체크된 사람들

    for (let i = 1; i < staffData.length; i++) {
      const name = staffData[i][CONFIG.STAFF_COLS.NAME - 1];
      const email = (staffData[i][CONFIG.STAFF_COLS.EMAIL - 1] || '').toString().trim();
      const isActive = staffData[i][CONFIG.STAFF_COLS.ACTIVE - 1];
      const calId = staffData[i][CONFIG.STAFF_COLS.PERSONAL_CAL - 1];
      const needsResync = staffData[i][CONFIG.STAFF_COLS.RESYNC - 1];

      if (name && email && isActive === true && calId) {
        const staffInfo = { name, email, calId, rowIndex: i + 1 };
        activeStaff.push(staffInfo);

        if (needsResync === true || needsResync === 'TRUE') {
          resyncStaff.push(staffInfo);
        }
      }
    }

    // 재공유 체크된 사람이 없으면 안내
    if (resyncStaff.length === 0) {
      ui.alert(
        '⚠️ 알림',
        '재공유할 담당자가 없습니다.\n\n담당자 탭의 F열(재공유)에 체크하고\n다시 실행해주세요.',
        ui.ButtonSet.OK
      );
      return;
    }

    // 확인 메시지
    const names = resyncStaff.map(s => s.name).join(', ');
    const confirmMsg = `🔄 캘린더 재공유\n\n다음 담당자의 캘린더를 재공유합니다:\n${names}\n\n• 해당 담당자의 캘린더 → 모두에게 재공유\n• 모든 캘린더 → 해당 담당자에게 재공유\n• 초대 메일이 다시 발송됩니다\n\n계속하시겠습니까?`;

    const response = ui.alert('🔄 캘린더 공유 재시도', confirmMsg, ui.ButtonSet.YES_NO);

    if (response !== ui.Button.YES) {
      return;
    }

    if (activeStaff.length === 0) {
      ui.alert('⚠️ 알림', '활성 담당자가 없습니다.', ui.ButtonSet.OK);
      return;
    }

    Logger.log(`🔄 캘린더 공유 재시도 시작 (체크된 담당자 ${resyncStaff.length}명)`);

    let deleted = 0;
    let reshared = 0;
    let failed = 0;
    const failedList = [];

    // 체크된 각 담당자 처리
    for (const targetStaff of resyncStaff) {
      Logger.log(`\n📧 [${targetStaff.name}] 캘린더 재공유 시작...`);

      // 1️⃣ 이 담당자의 캘린더를 → 모든 다른 담당자에게 재공유 (삭제→추가)
      Logger.log(`  ┌─ ${targetStaff.name}의 캘린더 → 다른 사람들에게 재공유`);
      for (const otherStaff of activeStaff) {
        if (otherStaff.email === targetStaff.email) continue;  // 본인 제외

        try {
          // ACL 목록 조회해서 기존 권한 ID 찾기
          const aclList = Calendar.Acl.list(targetStaff.calId);
          let existingAclId = null;

          if (aclList.items) {
            for (const acl of aclList.items) {
              if (acl.scope && acl.scope.type === 'user' &&
                  acl.scope.value.toLowerCase() === otherStaff.email.toLowerCase()) {
                existingAclId = acl.id;
                break;
              }
            }
          }

          // 기존 권한 있으면 삭제
          if (existingAclId) {
            try {
              Calendar.Acl.remove(targetStaff.calId, existingAclId);
              deleted++;
              Logger.log(`    ╠═ 🗑️ 기존 권한 삭제: ${otherStaff.name}`);
              Utilities.sleep(300);
            } catch(delErr) {
              // 삭제 실패해도 계속 진행 (추가 시도)
              Logger.log(`    ╠═ ⚠️ 삭제 실패 (${otherStaff.name}): ${delErr.message}`);
            }
          }

          // 다시 추가 (메일 재발송)
          Calendar.Acl.insert({
            role: 'owner',
            scope: {
              type: 'user',
              value: otherStaff.email
            }
          }, targetStaff.calId);

          reshared++;
          Logger.log(`    ╠═ ✅ 재공유 완료: ${otherStaff.name}`);
          Utilities.sleep(300);

        } catch(err) {
          // "Cannot change your own access level"은 정상 (무시)
          if (!err.message.includes('Cannot change')) {
            failed++;
            const errorMsg = `${targetStaff.name} → ${otherStaff.name}: ${err.message}`;
            failedList.push(errorMsg);
            Logger.log(`    ╠═ ❌ 실패: ${otherStaff.name} (${err.message})`);
          }
          Utilities.sleep(300);
        }
      }

      // 2️⃣ 모든 다른 담당자의 캘린더를 → 이 담당자에게 재공유 (삭제→추가)
      Logger.log(`  └─ 다른 사람들의 캘린더 → ${targetStaff.name}에게 재공유`);
      for (const otherStaff of activeStaff) {
        if (otherStaff.email === targetStaff.email) continue;  // 본인 제외

        try {
          // ACL 목록 조회해서 기존 권한 ID 찾기
          const aclList = Calendar.Acl.list(otherStaff.calId);
          let existingAclId = null;

          if (aclList.items) {
            for (const acl of aclList.items) {
              if (acl.scope && acl.scope.type === 'user' &&
                  acl.scope.value.toLowerCase() === targetStaff.email.toLowerCase()) {
                existingAclId = acl.id;
                break;
              }
            }
          }

          // 기존 권한 있으면 삭제
          if (existingAclId) {
            try {
              Calendar.Acl.remove(otherStaff.calId, existingAclId);
              deleted++;
              Logger.log(`    ╠═ 🗑️ 기존 권한 삭제: ${otherStaff.name} → ${targetStaff.name}`);
              Utilities.sleep(300);
            } catch(delErr) {
              // 삭제 실패해도 계속 진행
              Logger.log(`    ╠═ ⚠️ 삭제 실패: ${delErr.message}`);
            }
          }

          // 다시 추가 (메일 재발송)
          Calendar.Acl.insert({
            role: 'owner',
            scope: {
              type: 'user',
              value: targetStaff.email
            }
          }, otherStaff.calId);

          reshared++;
          Logger.log(`    ╠═ ✅ 재공유 완료: ${otherStaff.name} → ${targetStaff.name}`);
          Utilities.sleep(300);

        } catch(err) {
          // "Cannot change your own access level"은 정상 (무시)
          if (!err.message.includes('Cannot change')) {
            failed++;
            const errorMsg = `${otherStaff.name} → ${targetStaff.name}: ${err.message}`;
            failedList.push(errorMsg);
            Logger.log(`    ╠═ ❌ 실패: ${otherStaff.name} (${err.message})`);
          }
          Utilities.sleep(300);
        }
      }

      // 체크박스 해제
      staffSheet.getRange(targetStaff.rowIndex, CONFIG.STAFF_COLS.RESYNC).setValue(false);
      Logger.log(`  ✓ 체크박스 해제: ${targetStaff.name}`);
    }

    // 결과 메시지
    const resyncNames = resyncStaff.map(s => s.name).join(', ');
    let message = '✅ 캘린더 재공유 완료!\n\n';
    message += `【대상 담당자】\n`;
    message += `${resyncNames}\n\n`;
    message += `【처리 결과】\n`;
    message += `• 기존 권한 삭제: ${deleted}건\n`;
    message += `• 재공유 (메일 재발송): ${reshared}건\n`;

    if (failed > 0) {
      message += `• 실패: ${failed}건\n\n`;
      message += `【실패 목록】\n`;
      failedList.slice(0, 10).forEach(msg => {
        message += `⚠️ ${msg}\n`;
      });
      if (failedList.length > 10) {
        message += `\n... 외 ${failedList.length - 10}건 (로그 확인)\n`;
      }
    }

    message += '\n📧 모든 담당자에게 초대 메일이 재발송되었습니다!';
    message += '\n💡 이메일에서 초대를 수락해주세요.';

    ui.alert('✅ 완료', message, ui.ButtonSet.OK);
    Logger.log('✅ 캘린더 재공유 완료');

  } catch(e) {
    ui.alert('❌ 오류', '캘린더 공유 재시도 중 오류 발생: ' + e.message, ui.ButtonSet.OK);
    Logger.log('❌ 캘린더 공유 재시도 오류: ' + e.message);
  }
}

// ===== L열 색상 초기화 =====
function clearEventIdColors() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    '색상 초기화',
    'L열의 노란색 배경을 모두 제거하시겠습니까?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    return;
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const scheduleSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SCHEDULE);

    if (!scheduleSheet) {
      ui.alert('❌ 오류', '일정관리 시트를 찾을 수 없습니다.', ui.ButtonSet.OK);
      return;
    }

    const lastRow = scheduleSheet.getLastRow();
    scheduleSheet.getRange(2, CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID, lastRow - 1, 1).setBackground(null);

    ui.alert('✅ 완료', 'L열의 색상이 초기화되었습니다.', ui.ButtonSet.OK);
    Logger.log('✅ L열 색상 초기화 완료');

  } catch(e) {
    ui.alert('❌ 오류', '색상 초기화 실패: ' + e.message, ui.ButtonSet.OK);
    Logger.log('❌ 색상 초기화 오류: ' + e.message);
  }
}

// ===== L열 수정 감지 =====
function markEventIdModified(sheet, row, col) {
  try {
    sheet.getRange(row, col).setBackground(CONFIG.WARNING_COLOR);
    Logger.log('⚠️ 이벤트ID 수정 감지: ' + row + '행, ' + col + '열');
  } catch(e) {
    Logger.log('❌ 색상 표시 오류: ' + e.message);
  }
}

// ===== 공통 함수: 날짜 파싱 (종일 일정) =====
function parseEventDateTime(startDateValue, endDateValue) {
  const startDate = new Date(startDateValue);
  const endDate = new Date(endDateValue);

  const actualEndDate = new Date(endDate);
  actualEndDate.setDate(actualEndDate.getDate() + 1);

  return {
    startDateTime: startDate,
    endDateTime: actualEndDate,
    isAllDay: true
  };
}

// ===== 공통 함수: 일정 제목 생성 =====
function buildEventTitle(staff, round, title, paymentDone) {
  let eventTitle = `[${staff}]`;

  // 다양한 형식의 true 값 처리 (true, "TRUE", "true", 1 등)
  if (paymentDone === true || paymentDone === 'TRUE' || paymentDone === 'true' || paymentDone === 1) {
    eventTitle += ' [결완]';
  }

  eventTitle += ` ${title}`;

  if (round) {
    eventTitle += ` [${round}]`;
  }

  return eventTitle;
}

// ===== 담당자 색상 가져오기 =====
function getStaffColor(staffName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const staffSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.STAFF);
  const staffData = staffSheet.getDataRange().getValues();

  for (let i = 1; i < staffData.length; i++) {
    const name = staffData[i][CONFIG.STAFF_COLS.NAME - 1];
    const colorCode = staffData[i][CONFIG.STAFF_COLS.COLOR - 1];
    const isActive = staffData[i][CONFIG.STAFF_COLS.ACTIVE - 1];

    if (name === staffName && isActive === true) {
      return colorCode;
    }
  }

  Logger.log('⚠️ 담당자를 찾을 수 없음: ' + staffName + ' (기본 색상 사용)');
  return 1;
}

// ===== 담당자의 개인 캘린더 ID 가져오기 =====
function getStaffPersonalCalendar(staffName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const staffSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.STAFF);
  const staffData = staffSheet.getDataRange().getValues();

  for (let i = 1; i < staffData.length; i++) {
    const name = staffData[i][CONFIG.STAFF_COLS.NAME - 1];
    const isActive = staffData[i][CONFIG.STAFF_COLS.ACTIVE - 1];
    const personalCalId = staffData[i][CONFIG.STAFF_COLS.PERSONAL_CAL - 1];

    if (name === staffName && isActive === true) {
      return personalCalId;
    }
  }

  Logger.log('⚠️ 담당자의 개인 캘린더를 찾을 수 없음: ' + staffName);
  return null;
}

// ===== 이벤트ID로 담당자 찾기 (담당자 변경 감지용, Calendar API) =====
// ⚠️ 더 이상 사용되지 않음 - M열(이전담당자)로 대체됨. 성능 문제로 제거됨.
// 이 함수는 담당자 수만큼 Calendar API를 호출하여 매우 느렸음 (5초/건)
function getStaffByEventId(eventId) {
  if (!eventId) return null;

  // CalendarApp 형식(@포함) 호환성: @ 앞부분만 추출
  const pureEventId = eventId.includes('@') ? eventId.split('@')[0] : eventId;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const staffSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.STAFF);
  const staffData = staffSheet.getDataRange().getValues();

  for (let i = 1; i < staffData.length; i++) {
    const name = staffData[i][CONFIG.STAFF_COLS.NAME - 1];
    const isActive = staffData[i][CONFIG.STAFF_COLS.ACTIVE - 1];
    const personalCalId = staffData[i][CONFIG.STAFF_COLS.PERSONAL_CAL - 1];

    if (isActive === true && personalCalId) {
      try {
        // Calendar API로 이벤트 조회 (존재하면 성공, 없으면 예외 발생)
        Calendar.Events.get(personalCalId, pureEventId);
        return name;  // 이벤트가 존재하면 담당자명 반환
      } catch(e) {
        // 이벤트가 없으면 다음 캘린더 확인
        continue;
      }
    }
  }

  return null;
}

// ===== 일정 생성 (Calendar API) =====
function createEvent(calendarId, rowData, rowNumber, staffColorMap) {
  try {
    if (!calendarId) {
      Logger.log('⚠️ 캘린더 ID 없음');
      return null;
    }

    const startDateValue = rowData[CONFIG.SCHEDULE_COLS.START_DATE - 1];
    const endDateValue = rowData[CONFIG.SCHEDULE_COLS.END_DATE - 1];
    const round = rowData[CONFIG.SCHEDULE_COLS.ROUND - 1];
    const title = rowData[CONFIG.SCHEDULE_COLS.TITLE - 1];
    const staff = rowData[CONFIG.SCHEDULE_COLS.STAFF - 1];
    const content = rowData[CONFIG.SCHEDULE_COLS.CONTENT - 1];
    const paymentDone = rowData[CONFIG.SCHEDULE_COLS.PAYMENT_DONE - 1];

    if (!startDateValue || !endDateValue || !title || !staff) {
      Logger.log('❌ 필수 값 누락 (시작일, 종료일, 일정명, 담당자는 필수)');
      return null;
    }

    const { startDateTime, endDateTime } = parseEventDateTime(startDateValue, endDateValue);
    const eventTitle = buildEventTitle(staff, round || '', title, paymentDone);
    const description = content || '';
    // 성능 최적화: 캐시에서 색상 가져오기 (없으면 함수 호출)
    const colorCode = staffColorMap ? (staffColorMap[staff] || 1) : getStaffColor(staff);

    // Calendar API 형식으로 날짜 변환 (yyyy-MM-dd)
    const startDateStr = Utilities.formatDate(startDateTime, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const endDateStr = Utilities.formatDate(endDateTime, Session.getScriptTimeZone(), 'yyyy-MM-dd');

    // Calendar API로 이벤트 생성
    const event = Calendar.Events.insert({
      summary: eventTitle,
      description: description,
      start: { date: startDateStr },
      end: { date: endDateStr },
      colorId: colorCode.toString()
    }, calendarId);

    Logger.log('✅ 일정 생성 완료: ' + eventTitle);
    return event.id;

  } catch(e) {
    const title = rowData[CONFIG.SCHEDULE_COLS.TITLE - 1] || '(제목없음)';
    Logger.log(`❌ ${rowNumber}행 일정 생성 오류 (${title}): ${e.message}`);
    return null;
  }
}

// ===== 일정 업데이트 (Calendar API) =====
function updateEvent(calendarId, eventId, rowData, rowNumber, staffColorMap) {
  try {
    if (!calendarId || !eventId) {
      Logger.log('⚠️ 캘린더 ID 또는 이벤트 ID 없음');
      return false;
    }

    // CalendarApp 형식(@포함) 호환성: @ 앞부분만 추출
    const pureEventId = eventId.includes('@') ? eventId.split('@')[0] : eventId;

    const startDateValue = rowData[CONFIG.SCHEDULE_COLS.START_DATE - 1];
    const endDateValue = rowData[CONFIG.SCHEDULE_COLS.END_DATE - 1];
    const round = rowData[CONFIG.SCHEDULE_COLS.ROUND - 1];
    const title = rowData[CONFIG.SCHEDULE_COLS.TITLE - 1];
    const staff = rowData[CONFIG.SCHEDULE_COLS.STAFF - 1];
    const content = rowData[CONFIG.SCHEDULE_COLS.CONTENT - 1];
    const paymentDone = rowData[CONFIG.SCHEDULE_COLS.PAYMENT_DONE - 1];

    if (!startDateValue || !endDateValue || !title || !staff) {
      Logger.log('❌ 필수 값 누락');
      return false;
    }

    const { startDateTime, endDateTime } = parseEventDateTime(startDateValue, endDateValue);
    const eventTitle = buildEventTitle(staff, round || '', title, paymentDone);
    const description = content || '';
    // 성능 최적화: 캐시에서 색상 가져오기 (없으면 함수 호출)
    const colorCode = staffColorMap ? (staffColorMap[staff] || 1) : getStaffColor(staff);

    // Calendar API 형식으로 날짜 변환 (yyyy-MM-dd)
    const startDateStr = Utilities.formatDate(startDateTime, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const endDateStr = Utilities.formatDate(endDateTime, Session.getScriptTimeZone(), 'yyyy-MM-dd');

    // Calendar API로 이벤트 업데이트 (patch는 제공된 필드만 업데이트)
    Calendar.Events.patch({
      summary: eventTitle,
      description: description,
      start: { date: startDateStr },
      end: { date: endDateStr },
      colorId: colorCode.toString()
    }, calendarId, pureEventId);

    return true;

  } catch(e) {
    const title = rowData[CONFIG.SCHEDULE_COLS.TITLE - 1] || '(제목없음)';
    Logger.log(`❌ ${rowNumber}행 일정 업데이트 오류 (${title}): ${e.message}`);
    return false;
  }
}

// ===== 일정 삭제 (Calendar API) =====
function deleteEvent(calendarId, eventId, rowNumber, title) {
  try {
    if (!calendarId || !eventId) {
      Logger.log('⚠️ 캘린더 ID 또는 이벤트 ID 없음');
      return false;
    }

    // CalendarApp 형식(@포함) 호환성: @ 앞부분만 추출
    const pureEventId = eventId.includes('@') ? eventId.split('@')[0] : eventId;

    // Calendar API로 이벤트 삭제
    Calendar.Events.remove(calendarId, pureEventId);
    Logger.log('✅ 캘린더 이벤트 삭제 완료');
    return true;

  } catch(e) {
    const titleStr = title || '(제목없음)';
    Logger.log(`❌ ${rowNumber}행 일정 삭제 오류 (${titleStr}): ${e.message}`);
    return false;
  }
}

// ===== 결제창에서 일정 찾기 (이벤트ID로 매칭) =====
function findScheduleRowByEventId(eventId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const scheduleSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SCHEDULE);
    const scheduleData = scheduleSheet.getDataRange().getValues();

    Logger.log('🔍 이벤트ID로 일정 검색: ' + eventId);

    for (let i = 1; i < scheduleData.length; i++) {
      const rowEventId = scheduleData[i][CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID - 1];

      if (rowEventId === eventId) {
        Logger.log('✅ 일정 찾음: ' + (i + 1) + '행');
        return i + 1;
      }
    }

    Logger.log('⚠️ 일정을 찾을 수 없음 (이벤트ID: ' + eventId + ')');
    return null;

  } catch(e) {
    Logger.log('❌ 일정 찾기 오류: ' + e.message);
    return null;
  }
}

// ===== 결제창에서 행 삭제 (이벤트ID로 매칭) =====
function updatePaymentSheetByEventId(eventId, rowData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PAYMENT);
    const paymentData = paymentSheet.getDataRange().getValues();

    for (let i = 1; i < paymentData.length; i++) {
      const rowEventId = paymentData[i][CONFIG.PAYMENT_COLS.PERSONAL_EVENT_ID - 1];

      if (rowEventId === eventId) {
        const startDate = rowData[CONFIG.SCHEDULE_COLS.START_DATE - 1];
        const endDate = rowData[CONFIG.SCHEDULE_COLS.END_DATE - 1];
        const round = rowData[CONFIG.SCHEDULE_COLS.ROUND - 1];
        const title = rowData[CONFIG.SCHEDULE_COLS.TITLE - 1];
        const percent = rowData[CONFIG.SCHEDULE_COLS.PERCENT - 1];
        const combinedTitle = round ?
          `${title} [${round}${percent ? ' ' + percent : ''}]` :
          title;
        const staff = rowData[CONFIG.SCHEDULE_COLS.STAFF - 1];

        const dateRange = Utilities.formatDate(new Date(startDate), Session.getScriptTimeZone(), 'yyyy-MM-dd') +
                          ' ~ ' +
                          Utilities.formatDate(new Date(endDate), Session.getScriptTimeZone(), 'yyyy-MM-dd');

        const paymentRow = i + 1;
        paymentSheet.getRange(paymentRow, CONFIG.PAYMENT_COLS.DATE).setValue(dateRange);
        paymentSheet.getRange(paymentRow, CONFIG.PAYMENT_COLS.TITLE).setValue(combinedTitle);
        paymentSheet.getRange(paymentRow, CONFIG.PAYMENT_COLS.STAFF).setValue(staff);

        Logger.log(`✅ 결제창관리 업데이트 완료: ${paymentRow}행`);
        return true;
      }
    }

    Logger.log('⚠️ 결제창에서 해당 행을 찾지 못함 (이벤트ID: ' + eventId + ')');
    return false;

  } catch(e) {
    Logger.log('❌ 결제창 업데이트 오류: ' + e.message);
    return false;
  }
}

function deleteFromPaymentSheetByEventId(eventId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PAYMENT);
    const paymentData = paymentSheet.getDataRange().getValues();

    for (let i = paymentData.length - 1; i >= 1; i--) {
      const rowEventId = paymentData[i][CONFIG.PAYMENT_COLS.PERSONAL_EVENT_ID - 1];

      if (rowEventId === eventId) {
        paymentSheet.deleteRow(i + 1);
        Logger.log('✅ 결제창에서 행 삭제 완료: ' + (i + 1) + '행 (이벤트ID: ' + eventId + ')');
        return true;
      }
    }

    Logger.log('⚠️ 결제창에서 해당 행을 찾지 못함 (이벤트ID: ' + eventId + ')');
    return false;

  } catch(e) {
    Logger.log('❌ 결제창 행 삭제 오류: ' + e.message);
    return false;
  }
}

// ===== 결제창에 자동 추가 (이벤트ID 포함) =====
function addToPaymentSheet(rowData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PAYMENT);

    const startDate = rowData[CONFIG.SCHEDULE_COLS.START_DATE - 1];
    const endDate = rowData[CONFIG.SCHEDULE_COLS.END_DATE - 1];
    const round = rowData[CONFIG.SCHEDULE_COLS.ROUND - 1];
    const title = rowData[CONFIG.SCHEDULE_COLS.TITLE - 1];
    const percent = rowData[CONFIG.SCHEDULE_COLS.PERCENT - 1];
    const combinedTitle = round ?
      `${title} [${round}${percent ? ' ' + percent : ''}]` :
      title;
    const staff = rowData[CONFIG.SCHEDULE_COLS.STAFF - 1];
    const eventId = rowData[CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID - 1];

    if (!startDate || !endDate || !title || !staff || !eventId) {
      Logger.log('⚠️ 결제창 추가 실패: 필수 값 누락 (이벤트ID 필요)');
      return;
    }

    const dateRange = Utilities.formatDate(new Date(startDate), Session.getScriptTimeZone(), 'yyyy-MM-dd') +
                      ' ~ ' +
                      Utilities.formatDate(new Date(endDate), Session.getScriptTimeZone(), 'yyyy-MM-dd');

    const lastRow = paymentSheet.getLastRow();
    const newRow = lastRow + 1;

    paymentSheet.getRange(newRow, CONFIG.PAYMENT_COLS.TRANSFER).insertCheckboxes();
    paymentSheet.getRange(newRow, CONFIG.PAYMENT_COLS.COMPLETE).insertCheckboxes();
    paymentSheet.getRange(newRow, CONFIG.PAYMENT_COLS.DATE).setValue(dateRange);
    paymentSheet.getRange(newRow, CONFIG.PAYMENT_COLS.TITLE).setValue(combinedTitle);
    paymentSheet.getRange(newRow, CONFIG.PAYMENT_COLS.STAFF).setValue(staff);
    paymentSheet.getRange(newRow, CONFIG.PAYMENT_COLS.PERSONAL_EVENT_ID).setValue(eventId);

    Logger.log('✅ 결제창 추가 완료: ' + title + ' (이벤트ID: ' + eventId + ')');

  } catch(e) {
    Logger.log('❌ 결제창 추가 오류: ' + e.message);
  }
}

// ===== 결제창에 없으면 추가 (중복 방지 - 이벤트ID로 확인) =====
function addToPaymentSheetIfNotExists(rowData, paymentEventIdSet) {
  try {
    const eventId = rowData[CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID - 1];

    if (!eventId) {
      Logger.log('⚠️ 이벤트ID 없음 - 결제창 추가 건너뜀');
      return;
    }

    // 성능 최적화: Set에서 빠르게 확인 (없으면 시트 읽기)
    if (paymentEventIdSet) {
      if (paymentEventIdSet.has(eventId)) {
        Logger.log('⏭️ 결제창에 이미 존재: 이벤트ID ' + eventId);
        return;
      }
      // Set에 추가하여 다음 호출 시 중복 방지
      paymentEventIdSet.add(eventId);
    } else {
      // 캐시 없을 때 (하위 호환성)
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const paymentSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PAYMENT);
      const paymentData = paymentSheet.getDataRange().getValues();

      for (let i = 1; i < paymentData.length; i++) {
        const rowEventId = paymentData[i][CONFIG.PAYMENT_COLS.PERSONAL_EVENT_ID - 1];

        if (rowEventId === eventId) {
          Logger.log('⏭️ 결제창에 이미 존재: 이벤트ID ' + eventId);
          return;
        }
      }
    }

    addToPaymentSheet(rowData);

  } catch(e) {
    Logger.log('❌ 결제창 중복 확인 오류: ' + e.message);
  }
}

// ===== 1회성: 일정관리 eventId를 결제창관리에 동기화 (제목 기준 매칭) =====
function syncEventIdsByTitle() {
  const ui = SpreadsheetApp.getUi();

  const response = ui.alert(
    '🔧 EventID 동기화',
    '차수+일정명이 같은 행을 찾아서\n일정관리의 캘린더ID를 결제창관리에 덮어씁니다.\n\n계속하시겠습니까?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const scheduleSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SCHEDULE);
  const paymentSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PAYMENT);

  const scheduleData = scheduleSheet.getDataRange().getValues();
  const paymentData = paymentSheet.getDataRange().getValues();

  let fixed = 0;
  let notFound = 0;

  // 일정관리의 각 행 처리
  for (let i = 1; i < scheduleData.length; i++) {
    const scheduleEventId = scheduleData[i][CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID - 1];
    const scheduleRound = scheduleData[i][CONFIG.SCHEDULE_COLS.ROUND - 1];
    const scheduleTitle = scheduleData[i][CONFIG.SCHEDULE_COLS.TITLE - 1];
    const schedulePercent = scheduleData[i][CONFIG.SCHEDULE_COLS.PERCENT - 1];

    if (!scheduleEventId || !scheduleTitle) continue;

    // 결제창관리 제목 형식: "일정명 [차수 퍼센트]" 또는 "일정명"
    const combinedTitle = scheduleRound ?
      `${scheduleTitle} [${scheduleRound}${schedulePercent ? ' ' + schedulePercent : ''}]` :
      scheduleTitle;

    // 결제창관리에서 같은 제목 찾기
    let found = false;
    for (let j = 1; j < paymentData.length; j++) {
      const paymentTitle = paymentData[j][CONFIG.PAYMENT_COLS.TITLE - 1];
      const paymentEventId = paymentData[j][CONFIG.PAYMENT_COLS.PERSONAL_EVENT_ID - 1];

      // 제목이 같고 eventId가 다르면 수정
      if (paymentTitle === combinedTitle) {
        found = true;
        if (paymentEventId !== scheduleEventId) {
          paymentSheet.getRange(j + 1, CONFIG.PAYMENT_COLS.PERSONAL_EVENT_ID).setValue(scheduleEventId);
          fixed++;
          Logger.log(`✅ 수정: "${combinedTitle}" - ${paymentEventId} → ${scheduleEventId}`);
        }
        break;
      }
    }

    if (!found) {
      notFound++;
      Logger.log(`⚠️ 결제창관리에서 못 찾음: "${combinedTitle}"`);
    }
  }

  ui.alert(
    '✅ 완료',
    `EventID 동기화 완료!\n\n✅ 수정: ${fixed}개\n⚠️ 못 찾음: ${notFound}개`,
    ui.ButtonSet.OK
  );
  Logger.log(`\n총 ${fixed}개 수정 완료, ${notFound}개 못 찾음`);
}

// ===== 담당자 드롭다운 새로고침 =====
function updateStaffDropdown() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const staffSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.STAFF);
    const scheduleSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SCHEDULE);

    const staffData = staffSheet.getDataRange().getValues();
    const activeStaff = [];

    for (let i = 1; i < staffData.length; i++) {
      const name = staffData[i][CONFIG.STAFF_COLS.NAME - 1];
      const isActive = staffData[i][CONFIG.STAFF_COLS.ACTIVE - 1];

      if (name && isActive === true) {
        activeStaff.push(name);
      }
    }

    if (activeStaff.length === 0) {
      Logger.log('⚠️ 활성화된 담당자가 없습니다');
      return;
    }

    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(activeStaff, true)
      .build();

    const range = scheduleSheet.getRange('E2:E');
    range.setDataValidation(rule);

    Logger.log('✅ 드롭다운 업데이트 완료: ' + activeStaff.join(', '));

  } catch(error) {
    Logger.log('❌ 드롭다운 업데이트 오류: ' + error.message);
  }
}

// ===== 자동 실행: 일정관리 ↔ 결제창 동기화 =====
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  const sheetName = sheet.getName();
  const row = e.range.getRow();
  const col = e.range.getColumn();

  if (row === 1) return;

  if (sheetName === CONFIG.SHEET_NAMES.SCHEDULE && col === CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID) {
    markEventIdModified(sheet, row, col);
    return;
  }

  // M열 저장 로직 제거: E열 먼저 수정 후 J열 체크하는 워크플로우에서는 작동 안 함
  // syncAll()에서 결제창관리 시트에서 이전 담당자를 찾음

  if (sheetName === CONFIG.SHEET_NAMES.PAYMENT && (col === CONFIG.PAYMENT_COLS.TRANSFER || col === CONFIG.PAYMENT_COLS.COMPLETE)) {
    const paymentSheet = sheet;
    const transferChecked = paymentSheet.getRange(row, CONFIG.PAYMENT_COLS.TRANSFER).getValue();
    const completeChecked = paymentSheet.getRange(row, CONFIG.PAYMENT_COLS.COMPLETE).getValue();
    const eventId = paymentSheet.getRange(row, CONFIG.PAYMENT_COLS.PERSONAL_EVENT_ID).getValue();

    if (!eventId) {
      Logger.log('⚠️ 결제창에 이벤트ID 없음 - 일정을 찾을 수 없습니다');
      return;
    }

    const paymentDone = (transferChecked === true && completeChecked === true);

    const scheduleRow = findScheduleRowByEventId(eventId);
    if (scheduleRow) {
      const scheduleSheet = e.source.getSheetByName(CONFIG.SHEET_NAMES.SCHEDULE);
      scheduleSheet.getRange(scheduleRow, CONFIG.SCHEDULE_COLS.PAYMENT_DONE).setValue(paymentDone);
      Logger.log('✅ 일정관리 G열 업데이트: ' + scheduleRow + '행 → ' + paymentDone);
    }
  }
}


///////////////////////////////////////////////////////////////////////////////////////
function syncAll() {
  const ui = SpreadsheetApp.getUi();
  const MAX_BATCH = 120;
  const MAX_EXECUTION_TIME = 5 * 60 * 1000;

  const response = ui.alert(
    '⚙️ 캘린더 동기화',
    `현재 필터링된 일정을 동기화합니다.\n\n⚠️ 최대 ${MAX_BATCH}개까지 처리됩니다.\n\n계속하시겠습니까?`,
    ui.ButtonSet.YES_NO
  );
  if (response !== ui.Button.YES) return;

  // 사용자가 확인 후 실제 시작 시간 기록
  const startTime = new Date().getTime();
  Logger.log(`⏱️ 동기화 시작: ${new Date().toLocaleTimeString()}`);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SCHEDULE);
  const staffSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.STAFF);

  try {
    const filter = sheet.getFilter();
    if (!filter) {
      ui.alert('❌ 필터 필요', '먼저 필터를 설정해주세요!', ui.ButtonSet.OK);
      return;
    }

    Logger.log(`⏱️ 담당자 데이터 읽기 시작`);
    // 직원 캘린더 & 색상 캐시 (성능 최적화: 한 번만 읽기)
    const staffData = staffSheet.getDataRange().getValues();
    const staffCalendarMap = {};
    const staffColorMap = {};
    for (let i = 1; i < staffData.length; i++) {
      const name = staffData[i][CONFIG.STAFF_COLS.NAME - 1];
      const isActive = staffData[i][CONFIG.STAFF_COLS.ACTIVE - 1];
      const calId = staffData[i][CONFIG.STAFF_COLS.PERSONAL_CAL - 1];
      const colorCode = staffData[i][CONFIG.STAFF_COLS.COLOR - 1];
      if (name && isActive === true && calId) {
        staffCalendarMap[name] = calId;
        staffColorMap[name] = colorCode || 1;  // 기본 색상 1
      }
    }
    Logger.log(`⏱️ 담당자 데이터 완료 (${staffData.length}행)`);

    Logger.log(`⏱️ 결제창 데이터 읽기 시작`);
    // 결제창 이벤트ID 캐시 (성능 최적화: 한 번만 읽기)
    const paymentSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PAYMENT);
    const paymentData = paymentSheet.getDataRange().getValues();
    const paymentEventIdSet = new Set();
    for (let i = 1; i < paymentData.length; i++) {
      const eventId = paymentData[i][CONFIG.PAYMENT_COLS.PERSONAL_EVENT_ID - 1];
      if (eventId) {
        paymentEventIdSet.add(eventId);
      }
    }
    Logger.log(`⏱️ 결제창 데이터 완료 (${paymentData.length}행)`);

    Logger.log(`⏱️ 일정관리 데이터 읽기 시작`);
    const allData = sheet.getDataRange().getValues();
    Logger.log(`⏱️ 일정관리 데이터 완료 (${allData.length}행)`);

    Logger.log(`⏱️ 필터링 시작 (총 ${allData.length}행)`);
    const filterStartTime = new Date().getTime();
    const totalRows = allData.length;
    let workRows = [];
    let skippedCount = 0;
    let emptyRowCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;

    for (let i = 1; i < totalRows; i++) {
      const rowNumber = i + 1;
      const rowData = allData[i];
      const startDate = rowData[CONFIG.SCHEDULE_COLS.START_DATE - 1];
      const endDate = rowData[CONFIG.SCHEDULE_COLS.END_DATE - 1];
      const title = rowData[CONFIG.SCHEDULE_COLS.TITLE - 1];
      const staff = rowData[CONFIG.SCHEDULE_COLS.STAFF - 1];
      const status = rowData[CONFIG.SCHEDULE_COLS.STATUS - 1];
      const cancelled = rowData[CONFIG.SCHEDULE_COLS.CANCELLED - 1];

      // 최적화: 완전히 빈 행은 건너뛰기
      if (!startDate && !endDate && !title && !staff) {
        emptyRowCount++;
        continue;
      }

      // K열 일정취소 체크되어 있으면 건너뛰기
      if (cancelled === true || cancelled === 'TRUE') {
        cancelledCount++;
        continue;
      }

      // H열 상태가 "완료"이면 건너뛰기 (처리 안 함)
      if (status === '완료') {
        completedCount++;
        continue;
      }

      // "신규", "수정", 또는 빈 값만 처리
      const calId = staffCalendarMap[staff];

      if (!startDate || !endDate || !title || !staff || !calId) {
        skippedCount++;
        continue;
      }

      workRows.push(i);
    }

    const filterDuration = new Date().getTime() - filterStartTime;
    Logger.log(`⏱️ 필터링 완료: ${totalRows}행 중 빈행${emptyRowCount}, 취소${cancelledCount}, 완료${completedCount}, 스킵${skippedCount}, 처리대상${workRows.length} (${filterDuration}ms)`);

    if (workRows.length === 0) {
      ui.alert('⚠️ 처리할 일정 없음', '모든 행이 "완료" 상태이거나 필수 값이 누락되었습니다.\n\n로그를 확인하세요.', ui.ButtonSet.OK);
      return;
    }

    const totalRowsToProcess = Math.min(workRows.length, MAX_BATCH);
    let processed = 0, errors = 0;
    let lastProcessedRow = 0, lastProcessedTitle = '';
    let flushCounter = 0;
    const FLUSH_INTERVAL = 15; // 15개마다 flush

    for (let w = 0; w < totalRowsToProcess; w++) {
      const elapsed = new Date().getTime() - startTime;
      if (elapsed > MAX_EXECUTION_TIME) {
        // 타임아웃 전에 남은 변경사항 저장
        if (flushCounter > 0) {
          SpreadsheetApp.flush();
        }
        ui.alert('⏱️ 타임아웃', `5분이 경과하여 안전하게 중단되었습니다.\n\n✅ 처리: ${processed}개\n📍 마지막 처리: ${lastProcessedRow}행 - ${lastProcessedTitle}`, ui.ButtonSet.OK);
        break;
      }
      const i = workRows[w];
      const rowNumber = i + 1;
      const rowData = allData[i];
      const startDate = rowData[CONFIG.SCHEDULE_COLS.START_DATE - 1];
      const endDate = rowData[CONFIG.SCHEDULE_COLS.END_DATE - 1];
      const title = rowData[CONFIG.SCHEDULE_COLS.TITLE - 1];
      const staff = rowData[CONFIG.SCHEDULE_COLS.STAFF - 1];
      const cancelled = rowData[CONFIG.SCHEDULE_COLS.CANCELLED - 1];
      const staffChanged = rowData[CONFIG.SCHEDULE_COLS.STAFF_CHANGED - 1];
      const personalEventId = rowData[CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID - 1];
      const calId = staffCalendarMap[staff];

      // 방어 코드: calId 없으면 skip
      if (!calId) {
        Logger.log(`⚠️ ${rowNumber}행: ${staff} 담당자의 캘린더 ID 없음`);
        errors++;
        continue;
      }

      try {
        // === 담당자 변경 감지 (J열 체크됨) ===
        if (staffChanged === true && personalEventId) {
          Logger.log(`🔄 ${rowNumber}행 담당자변경 감지: E열="${staff}"`);

          // M열 무시하고 무조건 결제창관리에서 이전 담당자 찾기
          // (사용자 워크플로우: E열 먼저 변경 → J열 체크)
          let oldStaff = null;
          Logger.log(`🔍 결제창관리에서 이전 담당자 찾는 중...`);

          // 결제창관리에서 해당 eventId의 담당자 찾기
          for (let i = 1; i < paymentData.length; i++) {
            const paymentEventId = paymentData[i][CONFIG.PAYMENT_COLS.PERSONAL_EVENT_ID - 1];
            if (paymentEventId === personalEventId) {
              oldStaff = paymentData[i][CONFIG.PAYMENT_COLS.STAFF - 1];
              Logger.log(`✅ 결제창관리에서 이전 담당자 찾음: ${oldStaff}`);
              break;
            }
          }

          // 이전 담당자가 있고 현재 담당자와 다르면 삭제
          if (oldStaff && oldStaff !== staff) {
            const oldCalId = staffCalendarMap[oldStaff];
            if (oldCalId) {
              Logger.log(`🗑️ 이전 담당자(${oldStaff}) 캘린더에서 삭제 중...`);
              const deleteSuccess = deleteEvent(oldCalId, personalEventId, rowNumber, title);
              if (!deleteSuccess) {
                // 이전 캘린더 삭제 실패 시 에러 카운트
                errors++;
                continue;
              }
              Logger.log(`✅ 이전 캘린더에서 삭제 완료`);
            } else {
              Logger.log(`⚠️ ${oldStaff}의 캘린더 ID 없음`);
            }
          } else {
            Logger.log(`⚠️ 이전 담당자를 찾을 수 없거나 현재 담당자와 같음`);
          }

          Logger.log(`➕ 새 담당자(${staff}) 캘린더에 생성 중...`);
          const newEventId = createEvent(calId, rowData, rowNumber, staffColorMap);
          if (!newEventId) {
            // 생성 실패 시 에러 카운트
            errors++;
            continue;
          }

          sheet.getRange(rowNumber, CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID).setValue(newEventId);
          deleteFromPaymentSheetByEventId(personalEventId);
          // 수정: rowData 업데이트해서 전달 (flush 전이라 getValues() 사용 불가)
          const updatedRowData = rowData.slice();
          updatedRowData[CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID - 1] = newEventId;
          addToPaymentSheetIfNotExists(updatedRowData, paymentEventIdSet);

          // J열 체크 해제, M열 클리어 (M열은 더 이상 사용 안 함)
          sheet.getRange(rowNumber, CONFIG.SCHEDULE_COLS.STAFF_CHANGED).setValue(false);
          sheet.getRange(rowNumber, CONFIG.SCHEDULE_COLS.OLD_STAFF).clearContent();

          processed++; lastProcessedRow = rowNumber; lastProcessedTitle = title;
          flushCounter++;
          if (flushCounter >= FLUSH_INTERVAL) {
            SpreadsheetApp.flush();
            flushCounter = 0;
          }
          continue;
        }

        // === 취소 일정 ===
        if (cancelled === true && personalEventId) {
          const deleteSuccess = deleteEvent(calId, personalEventId, rowNumber, title);
          if (!deleteSuccess) {
            // 일정 삭제 실패 시 에러 카운트
            errors++;
            continue;
          }
          deleteFromPaymentSheetByEventId(personalEventId);
          sheet.getRange(rowNumber, CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID).clearContent();
          processed++; lastProcessedRow = rowNumber; lastProcessedTitle = title;
          flushCounter++;
          if (flushCounter >= FLUSH_INTERVAL) {
            SpreadsheetApp.flush();
            flushCounter = 0;
          }
          continue;
        }

        // === 이벤트 생성/업데이트 ===
        if (!personalEventId) {
          // 신규 생성
          const newEventId = createEvent(calId, rowData, rowNumber, staffColorMap);
          if (!newEventId) {
            // 생성 실패 시 에러 카운트
            errors++;
            continue;
          }
          sheet.getRange(rowNumber, CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID).setValue(newEventId);
          // 신규 생성 시 결제창 추가
          const updatedRowData = rowData.slice();
          updatedRowData[CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID - 1] = newEventId;
          addToPaymentSheetIfNotExists(updatedRowData, paymentEventIdSet);
        } else {
          // 업데이트
          const success = updateEvent(calId, personalEventId, rowData, rowNumber, staffColorMap);
          if (!success) {
            // 업데이트 실패 (Not Found 등) → L열 삭제하고 새로 생성
            Logger.log(`⚠️ ${rowNumber}행: 캘린더에 이벤트 없음 → L열 삭제 후 신규 생성`);
            sheet.getRange(rowNumber, CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID).clearContent();

            const newEventId = createEvent(calId, rowData, rowNumber, staffColorMap);
            if (!newEventId) {
              // 신규 생성도 실패 시 에러 카운트
              errors++;
              continue;
            }

            // 새 eventId 저장
            sheet.getRange(rowNumber, CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID).setValue(newEventId);

            // 결제창관리에서 이전 eventId 삭제하고 새 eventId 추가
            deleteFromPaymentSheetByEventId(personalEventId);
            const updatedRowData = rowData.slice();
            updatedRowData[CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID - 1] = newEventId;
            addToPaymentSheetIfNotExists(updatedRowData, paymentEventIdSet);

            Logger.log(`✅ ${rowNumber}행: 자동 복구 완료 (새 eventId: ${newEventId})`);
          } else {
            // 업데이트 성공 시 결제창관리도 업데이트
            updatePaymentSheetByEventId(personalEventId, rowData);
          }
        }

        processed++; lastProcessedRow = rowNumber; lastProcessedTitle = title;
        flushCounter++;
        if (flushCounter >= FLUSH_INTERVAL) {
          SpreadsheetApp.flush();
          flushCounter = 0;
        }
      } catch (err) {
        errors++;
        Logger.log(`❌ ${rowNumber}행 처리 오류 (${title}): ${err.message}`);
      }
    }

    // 마지막 남은 변경사항 flush
    if (flushCounter > 0) {
      SpreadsheetApp.flush();
    }

    ui.alert(
      '✅ 캘린더 동기화 완료',
      `처리: ${processed}개\n❌ 오류: ${errors}개\n📍 마지막 처리: ${lastProcessedRow}행 (${lastProcessedTitle})`,
      ui.ButtonSet.OK
    );
  } catch (e) {
    ui.alert('❌ 오류', `캘린더 동기화 중 오류: ${e.message}`, ui.ButtonSet.OK);
  }
}




// ===== 통계 업데이트 =====
function updateStatistics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const src = ss.getSheetByName(CONFIG.SHEET_NAMES.PAYMENT);
  const stats = ss.getSheetByName(CONFIG.SHEET_NAMES.STATS);
  const backup = ss.getSheetByName(CONFIG.SHEET_NAMES.BACKUP);

  if (!src || !stats || !backup) {
    throw new Error("결제창관리 / 통계뷰어 / 데이터백업 시트 중 일부가 없습니다.");
  }

  const data = src.getDataRange().getValues().slice(1);
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const monthlyMap = new Map();
  const staffMap = new Map();
  const toBackup = [];

  data.forEach(row => {
    const dateRange = row[CONFIG.PAYMENT_COLS.DATE - 1];
    const influencer = row[CONFIG.PAYMENT_COLS.TITLE - 1];
    const staff = row[CONFIG.PAYMENT_COLS.STAFF - 1];
    if (!dateRange || !staff) return;

    const [startText] = String(dateRange).split("~").map(v => v.trim());
    const startDate = new Date(startText);
    if (isNaN(startDate)) return;

    if (startDate < threeMonthsAgo) {
      toBackup.push(row);
      return;
    }

    const ym = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyMap.has(ym)) monthlyMap.set(ym, []);
    monthlyMap.get(ym).push({ dateRange, influencer, staff });

    if (!staffMap.has(staff)) staffMap.set(staff, []);
    staffMap.get(staff).push({ dateRange, influencer, ym });
  });

  stats.clear();

  const months = [];
  for (let i = -1; i <= 1; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${d.getMonth() + 1}월`;
    months.push({ ym, label });
  }

  const sortedStaffs = Array.from(staffMap.keys()).sort();
  const header = ["일정", "인플루언서명", "담당자"];
  const colGap = 1;
  let startCol = 1;

  months.forEach(({ ym, label }) => {
    const title = `📅 ${label} 일정 목록`;

    stats.getRange(1, startCol, 1, header.length)
      .merge()
      .setValue(title)
      .setFontWeight("bold")
      .setFontSize(10)
      .setBackground("#c7e1f5")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setWrap(false)
      .setBorder(true, true, true, true, true, true);

    stats.getRange(2, startCol, 1, header.length)
      .setValues([header])
      .setFontWeight("bold")
      .setBackground("#d9e1f2")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setWrap(false)
      .setBorder(true, true, true, true, true, true);

    const items = monthlyMap.get(ym)?.sort((a, b) => new Date(a.dateRange) - new Date(b.dateRange)) || [];
    let rows = items.map(it => [it.dateRange, it.influencer, it.staff]);
    if (rows.length === 0) rows = [["", "", ""]];

    stats.getRange(3, startCol, rows.length, header.length)
      .setValues(rows)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setWrap(false)
      .setBorder(true, true, true, true, true, true);

    startCol += header.length + colGap;
  });

  sortedStaffs.forEach((label) => {
    const title = `👤 ${label} 일정 목록`;

    stats.getRange(1, startCol, 1, header.length)
      .merge()
      .setValue(title)
      .setFontWeight("bold")
      .setFontSize(10)
      .setBackground("#f9d5b2")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setWrap(false)
      .setBorder(true, true, true, true, true, true);

    stats.getRange(2, startCol, 1, header.length)
      .setValues([header])
      .setFontWeight("bold")
      .setBackground("#fde9d9")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setWrap(false)
      .setBorder(true, true, true, true, true, true);

    const items = staffMap.get(label)?.sort((a, b) => new Date(a.dateRange) - new Date(b.dateRange)) || [];
    let rows = items.map(it => [it.dateRange, it.influencer, label]);
    if (rows.length === 0) rows = [["", "", ""]];

    stats.getRange(3, startCol, rows.length, header.length)
      .setValues(rows)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setWrap(false)
      .setBorder(true, true, true, true, true, true);

    startCol += header.length + colGap;
  });

  const totalRows = stats.getLastRow();
  for (let r = 1; r <= totalRows; r++) stats.setRowHeight(r, 26);

  if (toBackup.length > 0) {
    const header = ["일정", "인플루언서명", "담당자"];
    const monthGroups = {};

    toBackup.forEach(row => {
      const dateRange = row[CONFIG.PAYMENT_COLS.DATE - 1];
      const [startText] = String(dateRange).split("~").map(v => v.trim());
      const startDate = new Date(startText);
      if (isNaN(startDate)) return;
      const ym = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}`;
      if (!monthGroups[ym]) monthGroups[ym] = [];
      monthGroups[ym].push(row);
    });

    Object.keys(monthGroups).sort().reverse().forEach(ym => {
      const rows = monthGroups[ym];
      const staffs = {};
      rows.forEach(r => {
        const staff = r[CONFIG.PAYMENT_COLS.STAFF - 1];
        if (!staffs[staff]) staffs[staff] = [];
        staffs[staff].push(r);
      });

      const blockHeight = 2 + rows.length + (Object.keys(staffs).length * (rows.length + 3));
      backup.insertRowsBefore(1, blockHeight + 2);

      let startRow = 1;

      backup.getRange(startRow, 1, 1, header.length)
        .merge()
        .setValue(`📅 ${ym} 일정 백업`)
        .setFontWeight("bold")
        .setBackground("#c7e1f5");
      startRow++;

      backup.getRange(startRow, 1, 1, header.length)
        .setValues([header])
        .setFontWeight("bold")
        .setBackground("#d9e1f2");
      startRow++;

      const monthRows = rows.map(r => [
        r[CONFIG.PAYMENT_COLS.DATE - 1],
        r[CONFIG.PAYMENT_COLS.TITLE - 1],
        r[CONFIG.PAYMENT_COLS.STAFF - 1]
      ]);
      backup.getRange(startRow, 1, monthRows.length, header.length)
        .setValues(monthRows)
        .setBorder(true, true, true, true, true, true);
      startRow += monthRows.length + 1;

      Object.keys(staffs).sort().forEach(staff => {
        backup.getRange(startRow, 1, 1, header.length)
          .merge()
          .setValue(`👤 ${staff} 일정 목록`)
          .setFontWeight("bold")
          .setBackground("#fde9d9");
        startRow++;

        backup.getRange(startRow, 1, 1, header.length)
          .setValues([header])
          .setFontWeight("bold")
          .setBackground("#f9d5b2");
        startRow++;

        const staffRows = staffs[staff].map(r => [
          r[CONFIG.PAYMENT_COLS.DATE - 1],
          r[CONFIG.PAYMENT_COLS.TITLE - 1],
          staff
        ]);
        backup.getRange(startRow, 1, staffRows.length, header.length)
          .setValues(staffRows)
          .setBorder(true, true, true, true, true, true);
        startRow += staffRows.length + 1;
      });
    });

    Logger.log(`📦 백업 완료: ${toBackup.length}행 (${Object.keys(monthGroups).length}개월) 이동됨`);
  }

  SpreadsheetApp.flush();
}
