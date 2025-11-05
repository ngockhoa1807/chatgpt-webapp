import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Lấy API key từ biến môi trường Render
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Route xử lý
app.post("/generate", async (req, res) => {
  try {
    const { mode, type, semester, level, num, data } = req.body;
    let prompt = "";

    if (mode === "basic") {
      prompt = `
Tạo ${num} bài tập ${type === "tracnghiem" ? "trắc nghiệm 4 lựa chọn A, B, C, D" : "tự luận"}
thuộc ${semester === "hki" ? "học kỳ I" : "học kỳ II"}
môn Toán (Chương trình GDPT 2018), phần Xác suất và Thống kê,
ở mức độ ${level}.
`;
    } else if (mode === "advanced") {
      prompt = `
Tạo bài tập Toán nâng cao, gồm hai phần:
1️⃣ Phần XÁC SUẤT:
- Tự luận: ${data.xs_tl_nb || 0} câu nhận biết, ${data.xs_tl_th || 0} câu thông hiểu, ${data.xs_tl_vd || 0} câu vận dụng, ${data.xs_tl_vdc || 0} câu vận dụng cao.
- Trắc nghiệm: ${data.xs_tn_nb || 0} câu nhận biết, ${data.xs_tn_th || 0} câu thông hiểu, ${data.xs_tn_vd || 0} câu vận dụng, ${data.xs_tn_vdc || 0} câu vận dụng cao.

2️⃣ Phần THỐNG KÊ:
- Tự luận: ${data.tk_tl_nb || 0} câu nhận biết, ${data.tk_tl_th || 0} câu thông hiểu, ${data.tk_tl_vd || 0} câu vận dụng, ${data.tk_tl_vdc || 0} câu vận dụng cao.
- Trắc nghiệm: ${data.tk_tn_nb || 0} câu nhận biết, ${data.tk_tn_th || 0} câu thông hiểu, ${data.tk_tn_vd || 0} câu vận dụng, ${data.tk_tn_vdc || 0} câu vận dụng cao.

Yêu cầu: mỗi bài có nội dung rõ ràng, ngắn gọn, đúng chuyên đề.
`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }]
    });

    res.json({ result: completion.choices[0].message.content });
  } catch (error) {
    console.error("❌ Lỗi API:", error);
    res.status(500).json({ error: "Lỗi khi gọi OpenAI API" });
  }
});

// Render yêu cầu lắng nghe cổng PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server đang chạy tại cổng ${PORT}`));
