import { Navigate, Route, Routes } from 'react-router-dom'

import HomePage from './routes/HomePage'
import NotFoundPage from './routes/NotFoundPage'
import ProtectedRoute from './routes/ProtectedRoute'
import AdminLayout from './components/layout/AdminLayout'

import LoginPage from './routes/admin/LoginPage'
import EventListPage from './routes/admin/EventListPage'
import EventCreatePage from './routes/admin/EventCreatePage'
import EventLayout from './routes/admin/EventLayout'
import EventSettingsPage from './routes/admin/EventSettingsPage'
import ClassManagementPage from './routes/admin/ClassManagementPage'
import QuestionBuilderPage from './routes/admin/QuestionBuilderPage'
import ResultsDashboardPage from './routes/admin/ResultsDashboardPage'

import TeacherPage from './routes/teacher/TeacherPage'
import ClassPickerPage from './routes/parent/ClassPickerPage'
import BookingPage from './routes/parent/BookingPage'
import BookingViewPage from './routes/parent/BookingViewPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      {/* 관리교사: 구글 로그인 필요 */}
      <Route path="/admin/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<EventListPage />} />
          <Route path="/admin/events/new" element={<EventCreatePage />} />
          <Route path="/admin/events/:eventId" element={<EventLayout />}>
            <Route index element={<Navigate to="classes" replace />} />
            <Route path="settings" element={<EventSettingsPage />} />
            <Route path="classes" element={<ClassManagementPage />} />
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
