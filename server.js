import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import OpenAI from "openai";
import { API_KEY } from "./config.js";

const app = express();
const openai = new OpenAI({ apiKey: API_KEY });

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("."));

const prompts = {
  tracnghiem: "tạo bài tập trắc nghiệm 4 lựa chọn A, B, C, D",
  tuluan: "tạo bài tập tự luận",
  hki: "kiến thức ở học kì 1 chương trình GDPT 2018 môn toán phần xác suất và thống kê",
  hkii: "kiến thức ở học kì 2 chương trình GDPT 2018 môn toán phần xác suất và thống kê",
  nhanbiet: "Tạo bài tập đơn giản, ở mức độ nhận biết.",
  thonghieu: "Tạo bài tập đơn giản, ở mức độ thông hiểu.",
  vandung: "Tạo bài tập đơn giản, ở mức độ vận dụng.",
  vandungcao: "Tạo bài tập đơn giản, ở mức độ vận dụng cao."
};

app.post("/generate", async (req, res) => {
  const { type, semester, level, num } = req.body;
  const prompt = `${prompts[type]}, ${prompts[semester]}, ${prompts[level]}, số lượng ${num} câu hỏi.`;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });
    res.json({ result: completion.choices[0].message.content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: "Lỗi khi gọi API." });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`✅ Server chạy tại http://localhost:${PORT}`));
