import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

// cấu hình thư mục tĩnh
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// route trả về giao diện chính
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ============= API xử lý tạo bài tập =============
app.post("/generate", async (req, res) => {
  try {
    if (!OPENAI_KEY) {
      return res.status(500).json({ result: "Chưa cấu hình OPENAI_API_KEY." });
    }

    const { mode, type, semester, level, num, data, program } = req.body;
    const programText = program || "môn Toán THCS (Chương trình Giáo dục Phổ thông 2018)";
    let prompt = "";

    if (mode === "basic") {
      prompt = `Tạo ${num} bài tập ${type === "tracnghiem" ? "trắc nghiệm" : "tự luận"}
cho ${programText}, ${semester === "hki" ? "Học kỳ I" : "Học kỳ II"}, mức độ ${level}.`;
    } else if (mode === "advanced") {
      const mapping = {
        xs_tl_nb: "Xác suất – Tự luận – Nhận biết",
        xs_tl_th: "Xác suất – Tự luận – Thông hiểu",
        xs_tl_vd: "Xác suất – Tự luận – Vận dụng",
        xs_tl_vdc: "Xác suất – Tự luận – Vận dụng cao",
        xs_tn_nb: "Xác suất – Trắc nghiệm – Nhận biết",
        xs_tn_th: "Xác suất – Trắc nghiệm – Thông hiểu",
        xs_tn_vd: "Xác suất – Trắc nghiệm – Vận dụng",
        xs_tn_vdc: "Xác suất – Trắc nghiệm – Vận dụng cao",
        tk_tl_nb: "Thống kê – Tự luận – Nhận biết",
        tk_tl_th: "Thống kê – Tự luận – Thông hiểu",
        tk_tl_vd: "Thống kê – Tự luận – Vận dụng",
        tk_tl_vdc: "Thống kê – Tự luận – Vận dụng cao",
        tk_tn_nb: "Thống kê – Trắc nghiệm – Nhận biết",
        tk_tn_th: "Thống kê – Trắc nghiệm – Thông hiểu",
        tk_tn_vd: "Thống kê – Trắc nghiệm – Vận dụng",
        tk_tn_vdc: "Thống kê – Trắc nghiệm – Vận dụng cao"
      };
      const parts = [];
      for (const key in mapping) {
        const val = parseInt(data[key]) || 0;
        if (val > 0) parts.push(`- ${mapping[key]}: ${val} câu`);
      }
      if (parts.length === 0) return res.json({ result: "Không có yêu cầu nào hợp lệ." });
      prompt = `Tạo bài tập Toán THCS trong ${programText} theo yêu cầu:\n${parts.join("\n")}`;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Bạn là giáo viên Toán THCS, tạo bài tập rõ ràng theo chương trình GDPT 2018." },
          { role: "user", content: prompt }
        ]
      })
    });

    const json = await response.json();
    const result = json.choices?.[0]?.message?.content || "Không có kết quả!";
    res.json({ result });
  } catch (err) {
    console.error("Lỗi:", err);
    res.status(500).json({ result: "Lỗi khi gọi OpenAI API." });
  }
});

// ================================================
app.listen(PORT, () => console.log(`✅ Server chạy tại cổng ${PORT}`));
