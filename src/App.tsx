import { Navigate, Route, Routes } from 'react-router-dom'

import { isSupabaseConfigured } from './lib/supabaseClient'
import HomePage from './routes/HomePage'
import NotFoundPage from './routes/NotFoundPage'
import ProtectedRoute from './routes/ProtectedRoute'
import AdminLayout from './components/layout/AdminLayout'

import EventListPage from './routes/admin/EventListPage'
import EventCreatePage from './routes/admin/EventCreatePage'
import EventLayout from './routes/admin/EventLayout'
import EventSettingsPage from './routes/admin/EventSettingsPage'
import ClassManagementPage from './routes/admin/ClassManagementPage'
import BlockedSlotsPage from './routes/admin/BlockedSlotsPage'
import QuestionBuilderPage from './routes/admin/QuestionBuilderPage'
import ResultsDashboardPage from './routes/admin/ResultsDashboardPage'

import TeacherPage from './routes/teacher/TeacherPage'
import ClassPickerPage from './routes/parent/ClassPickerPage'
import BookingPage from './routes/parent/BookingPage'
import BookingViewPage from './routes/parent/BookingViewPage'

export default function App() {
  // 환경 변수가 없으면 어느 화면도 동작하지 않는다. 흰 화면 대신 이유를 알려준다.
  if (!isSupabaseConfigured) {
    return (
      <div className="page page--narrow">
        <div className="card stack">
          <h1>설정이 필요합니다</h1>
          <div className="alert alert--error">
            데이터베이스 주소와 키가 설정되지 않아 앱을 열 수 없습니다.
          </div>
          <p className="muted">배포한 곳의 환경 변수에 아래 두 값을 넣고 다시 배포해 주세요.</p>
          <ul className="tiny" style={{ margin: 0, paddingLeft: 18 }}>
            <li>
              <code>VITE_SUPABASE_URL</code>
            </li>
            <li>
              <code>VITE_SUPABASE_ANON_KEY</code>
            </li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      {/* 관리교사 로그인은 첫 화면에서 바로 한다 (별도 로그인 페이지 없음) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<EventListPage />} />
          <Route path="/admin/events/new" element={<EventCreatePage />} />
          <Route path="/admin/events/:eventId" element={<EventLayout />}>
            <Route index element={<Navigate to="classes" replace />} />
            <Route path="settings" element={<EventSettingsPage />} />
            <Route path="classes" element={<ClassManagementPage />} />
            <Route path="blocked" element={<BlockedSlotsPage />} />
            <Route path="questions" element={<QuestionBuilderPage />} />
            <Route path="results" element={<ResultsDashboardPage />} />
          </Route>
        </Route>
      </Route>

      {/* 담임교사: 반별 링크 하나로 시간 막기 + 결과 확인 */}
      <Route path="/teacher/:classToken" element={<TeacherPage />} />

      {/* 학부모: 행사 공유 링크 -> 반 선택 -> 작성 */}
      <Route path="/event/:eventToken" element={<ClassPickerPage />} />
      <Route path="/event/:eventToken/class/:classId" element={<BookingPage />} />

      {/* 제출 완료 화면 겸 재방문 확인 화면 */}
      <Route path="/booking/:bookingToken" element={<BookingViewPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
