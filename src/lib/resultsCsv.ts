import { format, parseISO } from 'date-fns'
import { formatDateLabel, formatSlotLabel, formatTimeLabel, slotEndLabel, slotKey } from './slots'
import type { SlotGrid } from './slots'
import type { TeacherBooking } from './types'

/**
 * 담임 선생님이 신청 현황을 엑셀에서 열어 정리하실 수 있도록 CSV로 만든다.
 *
 * 화면의 시간표를 그대로 옮긴 표가 먼저 오고, 한 줄 띄운 뒤 학생별 상세가 붙는다.
 * 엑셀은 이 둘을 한 시트에 위아래로 보여준다.
 */

/** 이름에 쉼표가 들어가도 엑셀이 칸을 쪼개지 않도록 모든 값을 감싼다. */
function cell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

function row(values: string[]): string {
  return values.map(cell).join(',')
}

export function buildResultsCsv(params: {
  grid: SlotGrid
  bookings: TeacherBooking[]
  /** 칸마다 그 시간을 희망한 학생 이름들 */
  namesByKey: Map<string, string[]>
  /** 담임 선생님이 막아둔 칸 */
  blockedKeys: Set<string>
  eventTitle: string
  className: string
}): string {
  const { grid, bookings, namesByKey, blockedKeys, eventTitle, className } = params
  const lines: string[] = [row([`${eventTitle} · ${className}`]), '']

  // ── 시간표 (행: 시간, 열: 날짜) ──────────────────────────────
  lines.push(row(['시간', ...grid.dates.map(formatDateLabel)]))
  for (const time of grid.times) {
    const cells = grid.dates.map((date) => {
      const key = slotKey(date, time)
      const names = namesByKey.get(key) ?? []
      if (names.length > 0) return names.join(', ')
      // 빈 칸과 구분돼야 "여긴 원래 열지 않았다"를 알 수 있다
      return blockedKeys.has(key) ? '마감' : ''
    })
    // 화면과 같은 모양으로 '09:00~09:30'
    const timeLabel = `${formatTimeLabel(time)}~${slotEndLabel(time, grid.durationMinutes)}`
    lines.push(row([timeLabel, ...cells]))
  }

  // ── 학생별 상세 ─────────────────────────────────────────────
  lines.push('', '')

  // 나중에 추가된 질문이 빠진 응답도 있을 수 있어, 나온 순서대로 열을 모은다
  const questions: string[] = []
  for (const booking of bookings) {
    for (const answer of booking.answers) {
      if (!questions.includes(answer.question_text)) questions.push(answer.question_text)
    }
  }

  lines.push(row(['번호', '학생 이름', '확정 시간', '희망 시간', ...questions, '제출 일시']))

  bookings.forEach((booking, index) => {
    const answerByQuestion = new Map(
      booking.answers.map((answer) => [
        answer.question_text,
        Array.isArray(answer.value) ? answer.value.join(', ') : answer.value,
      ]),
    )

    lines.push(
      row([
        String(index + 1),
        booking.student_name,
        // 선생님이 엑셀에서 직접 채우시는 칸이라 비워 둔다
        '',
        booking.slots.map((s) => formatSlotLabel(s.slot_date, s.slot_start_time)).join(', '),
        ...questions.map((question) => answerByQuestion.get(question) ?? ''),
        format(parseISO(booking.submitted_at), 'M/d HH:mm'),
      ]),
    )
  })

  return lines.join('\r\n')
}

/** 파일 이름에 쓸 수 없는 글자를 덜어낸다 ('1학년 2/3반' 같은 이름이 들어온다) */
function safeFileNamePart(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, '').trim()
}

export function resultsCsvFileName(className: string): string {
  return `${safeFileNamePart(className)}_신청현황_${format(new Date(), 'yyyyMMdd')}.csv`
}

/**
 * 엑셀은 BOM이 없으면 UTF-8을 알아보지 못해 한글이 깨진다. 앞에 반드시 붙인다.
 */
export function downloadCsv(fileName: string, csv: string): void {
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()

  URL.revokeObjectURL(url)
}
