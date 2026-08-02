import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { isSupabaseConfigured } from './lib/supabaseClient'
import HomePage from './routes/HomePage'
import NotFoundPage from './routes/NotFoundPage'
import ProtectedRoute from './routes/ProtectedRoute'
import AdminLayout from './components/layout/AdminLayout'

import TeacherPage from './routes/teacher/TeacherPage'
import ClassPickerPage from './routes/parent/ClassPickerPage'
import BookingPage from './routes/parent/BookingPage'
import BookingViewPage from './routes/parent/BookingViewPage'

/*
 * 관리 화면만 따로 내려받는다.
 *
 * 이 앱을 쓰는 사람 대부분은 학부모이고, 대개 휴대폰으로 링크를 눌러 들어온다.
 * 전부 한 덩어리로 묶어두면 그분들도 협의회를 만들고 설정하는 화면까지 같이 받는데,
 * 그건 평생 열어볼 일이 없는 화면이다. 관리교사만 그 값을 치르게 한다.
 *
 * 담임·학부모 화면은 일부러 함께 둔다. 저 둘은 링크를 누른 사람이 곧장 보는 화면이라,
 * 쪼개면 서버(싱가포르)를 한 번 더 다녀오는 시간이 기다림으로 그대로 드러난다.
 *
 * 기다리는 표시는 AdminLayout과 EventLayout 안쪽에 둔다. 각 파일의 주석 참고.
 */
const EventListPage = lazy(() => import('./routes/admin/EventListPage'))
const EventCreatePage = lazy(() => import('./routes/admin/EventCreatePage'))
const EventLayout = lazy(() => import('./routes/admin/EventLayout'))
const EventSettingsPage = lazy(() => import('./routes/admin/EventSettingsPage'))
const ClassManagementPage = lazy(() => import('./routes/admin/ClassManagementPage'))
const BlockedSlotsPage = lazy(() => import('./routes/admin/BlockedSlotsPage'))
const QuestionBuilderPage = lazy(() => import('./routes/admin/QuestionBuilderPage'))
const ResultsDashboardPage = lazy(() => import('./routes/admin/ResultsDashboardPage'))

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
