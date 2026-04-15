# Session Feature Flow

## 1. Tổng quan

Thư mục `frontend/src/features/session` chứa toàn bộ luồng phỏng vấn AI. Các file chính:
- `index.ts`
- `components/SetupSession.tsx`
- `components/InterviewRoom.tsx`
- `components/SessionDetail.tsx`
- `hooks/useInterviewSession.ts`
- `hooks/useAudioRecorder.ts`
- `hooks/useSpeech.ts`
- `types/index.ts`

## 2. `index.ts`

File này chỉ xuất khẩu các thành phần và hook trong module `session` để phần khác của ứng dụng có thể import dễ dàng.

```ts
export * from './components/InterviewRoom';
export * from './components/SetupSession';
export * from './components/SessionDetail';
export * from './hooks/useInterviewSession';
export * from './hooks/useAudioRecorder';
export * from './hooks/useSpeech';
export * from './types';
```

## 3. `SetupSession.tsx`

### Mục đích
Tạo và cấu hình một phiên phỏng vấn mới.

### Luồng hoạt động
1. Người dùng nhập hoặc tải lên CV.
2. Người dùng nhập nội dung Job Description.
3. Người dùng chọn:
   - loại phỏng vấn (`Behavioral`, `Technical`, `HR`)
   - ngôn ngữ (`vi`, `en`)
   - chế độ Stress-test
4. Khi bấm nút `Bắt đầu phỏng vấn`, component gọi API backend:
   - `POST http://127.0.0.1:8000/api/v1/interview/setup`
   - payload: `{ cv_text, jd_text, interview_type, language, is_stress_test }`
5. Nếu backend trả về `session_id`, điều hướng tới `/session/{sessionId}`.

### Kết nối với backend
- `/api/v1/interview/setup`

## 4. `InterviewRoom.tsx`

### Mục đích
Hiển thị phòng phỏng vấn trực tiếp, quản lý giao diện Q&A, ghi âm và phát âm AI.

### Luồng hoạt động
1. Lấy `id` từ URL bằng `useParams()`.
2. Khởi tạo hook `useInterviewSession(id, speakText)` để quản lý trạng thái.
3. Khởi tạo hook audio:
   - `useAudioRecorder(session?.language || 'vi')`
   - `useSpeech()` để đọc câu hỏi AI.
4. Khi component render, `useInterviewSession` sẽ tải dữ liệu session và nếu cần gọi `/interview/start`.
5. Người dùng có thể ghi âm, nhập văn bản hoặc dùng transcript để gửi câu trả lời.
6. Khi gửi trả lời, `InterviewRoom` gọi `submitAnswer(...)` từ `useInterviewSession`.
7. Nếu backend trả về `should_end=true`, hook tự động gọi `endSession(...)`.

### Thành phần con
- `InterviewHeader` — hiển thị trạng thái phiên, phase hiện tại, nút kết thúc.
- `ChatHistory` — hiển thị các lượt hỏi đáp.
- `SessionControls` — điều khiển ghi âm, gửi, và hiển thị transcript.

## 5. `useInterviewSession.ts`

### Mục đích
Quản lý trạng thái phiên phỏng vấn và tất cả tương tác với backend.

### Biến trạng thái chính
- `session`: thông tin session từ backend
- `turns`: danh sách lượt hỏi đáp
- `currentQuestion`: câu hỏi AI hiện tại
- `currentPhase`: giai đoạn phỏng vấn
- `isProcessing`: trạng thái đang gửi
- `error`: lỗi hiển thị

### Luồng load ban đầu
1. `loadData()` gọi `GET /api/v1/history/{id}` để tải session.
2. Nếu session đang ở trạng thái `setup` hoặc `in_progress` và chưa có lượt nào, sẽ tự động gọi:
   - `POST /api/v1/interview/start?session_id={id}`
3. Nhận về dữ liệu:
   - `first_question`
   - `current_phase`
   - `audio_base64`
4. Gọi `speakText(startData.first_question, data.language)` để đọc câu hỏi.

### Luồng submit câu trả lời
1. Người dùng gọi `submitAnswer(answerText, audioBlob, audioUrl)`.
2. Nếu không có văn bản và có `audioBlob`, sẽ gọi `POST /api/v1/interview/transcribe`.
3. Gửi câu trả lời cuối cùng tới backend:
   - `POST /api/v1/interview/chat`
   - payload: `{ session_id, message }`
4. Nếu thành công, cập nhật:
   - `currentQuestion` = `result.reply`
   - `currentPhase` = `result.current_phase`
   - phát âm `result.reply`
5. Nếu backend trả về `should_end=true`, gọi `endSession(...)`.

### Luồng kết thúc phiên
1. `endSession(currentHistory)` gọi:
   - `POST /api/v1/interview/end`
   - payload chứa: `session_id`, `history`, `cv_text`, `jd_text`, `interview_type`, `language`, `evaluations`.
2. Nếu thành công, điều hướng về `/session/{id}/summary`.

### Kết nối backend
- `GET /api/v1/history/{id}`
- `POST /api/v1/interview/start?session_id={id}`
- `POST /api/v1/interview/transcribe`
- `POST /api/v1/interview/chat`
- `POST /api/v1/interview/end`

## 6. `useAudioRecorder.ts`

### Mục đích
Quản lý ghi âm micro, tạo audio blob và thực hiện speech recognition cục bộ nếu trình duyệt hỗ trợ.

### Luồng hoạt động chính
1. `startRecording()`
   - Yêu cầu quyền microphone
   - Tạo `MediaStream` và `AudioContext`
   - Khởi tạo `MediaRecorder`
   - Thu thập `audioChunks`
   - Khởi tạo `SpeechRecognition` nếu có
   - Cập nhật trạng thái `isRecording`, `recordingState`, `audioLevel`
2. `stopRecording()`
   - Dừng ghi âm và speech recognition
   - Tạo `audioBlob` và `audioUrl`
   - Chuyển trạng thái sang `reviewing`
3. `resetRecording()`
   - Xóa dữ liệu âm thanh, transcript và trả về trạng thái `idle`

### Kết quả sử dụng
- `audioBlob` được dùng để gửi file audio lên backend `transcribe`
- `transcript` được dùng để hiển thị trước khi gửi

## 7. `useSpeech.ts`

### Mục đích
Phát âm câu hỏi/đáp của AI.

### Luồng hoạt động
1. `speakText(text, lang)`
   - Nếu `lang === 'vi'`, gọi OpenAI TTS qua `https://api.openai.com/v1/audio/speech`.
   - Nếu thành công, phát audio bằng `Audio` object.
   - Nếu thất bại, fallback về `window.speechSynthesis`.
   - Nếu `lang !== 'vi'`, dùng luôn `window.speechSynthesis`.
2. `stopSpeaking()` dừng âm thanh hiện đang phát.

### Lưu ý
OpenAI TTS phụ thuộc vào `VITE_OPENAI_API_KEY` trong frontend.

## 8. `SessionDetail.tsx`

### Mục đích
Hiển thị kết quả và đánh giá sau khi phiên phỏng vấn hoàn thành.

### Luồng hoạt động
1. Lấy `id` từ URL.
2. Gọi Firestore để tải dữ liệu session:
   - `interview_sessions/{id}`
3. Gọi Firestore để tải lượt trả lời:
   - `interview_turns` nơi `sessionId == id` và `userId == user.uid`
4. Tính điểm trung bình từ `turn.evaluation.scores`.
5. Hiển thị:
   - tổng quan phiên phỏng vấn
   - điểm trung bình
   - danh sách lượt câu hỏi/đáp
   - đánh giá STAR và feedback

### Ghi chú quan trọng
`SessionDetail.tsx` không gọi backend Python mà dùng Firestore trực tiếp.

## 9. Luồng tổng thể

1. Người dùng vào trang `SetupSession`.
2. Nhập CV, JD, chọn loại và ngôn ngữ.
3. Gọi backend `/interview/setup` để tạo phiên.
4. Chuyển sang `InterviewRoom`.
5. `InterviewRoom` dùng `useInterviewSession` để:
   - load session từ `/history/{id}`
   - khởi tạo cuộc phỏng vấn qua `/interview/start`
6. `InterviewRoom` cho phép:
   - ghi âm bằng `useAudioRecorder`
   - gửi câu trả lời
   - nghe câu hỏi bằng `useSpeech`
7. Khi gửi trả lời, `useInterviewSession` gọi `/interview/chat`.
8. Khi backend báo kết thúc, `useInterviewSession` gọi `/interview/end`.
9. Người dùng được điều hướng tới `SessionDetail`.

## 10. Sơ đồ nhanh

- `SetupSession.tsx` → `POST /interview/setup` → `navigate(/session/{id})`
- `InterviewRoom.tsx` → `useInterviewSession` → `GET /history/{id}` → `POST /interview/start`
- `InterviewRoom.tsx` → `useAudioRecorder` + `useSpeech`
- `InterviewRoom.tsx` → gửi câu trả lời → `POST /interview/chat`
- `useInterviewSession` → nếu đóng phiên `POST /interview/end`
- `SessionDetail.tsx` → Firestore read `interview_sessions`, `interview_turns`

## 11. Kết luận

Các file trong `frontend/src/features/session` phối hợp để:
- xây dựng phiên làm việc
- chuyển đổi dữ liệu CV/JD thành session backend
- quản lý câu hỏi, trả lời, audio và trạng thái
- kết thúc và hiển thị kết quả

Đây là luồng đầy đủ của module phỏng vấn AI ở frontend.