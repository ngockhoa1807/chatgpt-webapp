import express from "express";

const app = express();
app.use(express.json());
app.use(express.static("public")); // nếu frontend nằm trong thư mục public

const PORT = process.env.PORT || 3000;
const OPENAI_KEY = process.env.OPENAI_API_KEY; // <-- LẤY TỪ BIẾN MÔI TRƯỜNG

if (!OPENAI_KEY) {
  console.error("ERROR: OPENAI_API_KEY is not set. Please set the environment variable.");
  // Note: chúng ta vẫn khởi động server vì trên Render bạn sẽ thêm biến và redeploy
}

// helper: chuyển mã mức độ sang chuỗi dễ đọc
function humanLevel(code) {
  return code === "nhanbiet" ? "nhận biết"
       : code === "thonghieu" ? "thông hiểu"
       : code === "vandung" ? "vận dụng"
       : code === "vandungcao" ? "vận dụng cao"
       : code;
}

app.post("/generate", async (req, res) => {
  try {
    if (!OPENAI_KEY) {
      return res.status(500).json({ result: "Server chưa cấu hình API key (OPENAI_API_KEY)." });
    }

    const { mode, type, semester, level, num, data, program } = req.body;

    // default program nếu client không gửi
    const programText = program || "môn Toán THCS (Chương trình Giáo dục Phổ thông 2018)";

    let prompt = "";

    if (mode === "basic") {
      if (!type || !semester || !level || !num) {
        return res.status(400).json({ result: "Thiếu tham số cho chế độ cơ bản." });
      }

      const readableLevel = humanLevel(level);

      prompt = `Bạn là giáo viên Toán THCS. Hãy tạo ${num} bài tập ${type === "tracnghiem" ? "trắc nghiệm 4 lựa chọn (A-D) — kèm đáp án đúng" : "tự luận"}
cho ${programText}, thuộc ${semester === "hki" ? "Học kỳ I" : "Học kỳ II"}, ở mức độ ${readableLevel}.
Yêu cầu: mỗi câu rõ ràng, có số thứ tự. Với trắc nghiệm, đưa 4 phương án A, B, C, D và đánh dấu đáp án đúng. Ngắn gọn, phù hợp học sinh THCS.`;
    } else if (mode === "advanced") {
      // data: object chứa các id và số lượng (các ô mặc định = 0)
      if (!data || typeof data !== "object") {
        return res.status(400).json({ result: "Thiếu dữ liệu cho chế độ nâng cao." });
      }

      // mapping id -> mô tả
      const mapping = {
        xs_tl_nb: "Phần Xác suất — Tự luận — Nhận biết",
        xs_tl_th: "Phần Xác suất — Tự luận — Thông hiểu",
        xs_tl_vd: "Phần Xác suất — Tự luận — Vận dụng",
        xs_tl_vdc: "Phần Xác suất — Tự luận — Vận dụng cao",

        xs_tn_nb: "Phần Xác suất — Trắc nghiệm — Nhận biết",
        xs_tn_th: "Phần Xác suất — Trắc nghiệm — Thông hiểu",
        xs_tn_vd: "Phần Xác suất — Trắc nghiệm — Vận dụng",
        xs_tn_vdc: "Phần Xác suất — Trắc nghiệm — Vận dụng cao",

        tk_tl_nb: "Phần Thống kê — Tự luận — Nhận biết",
        tk_tl_th: "Phần Thống kê — Tự luận — Thông hiểu",
        tk_tl_vd: "Phần Thống kê — Tự luận — Vận dụng",
        tk_tl_vdc: "Phần Thống kê — Tự luận — Vận dụng cao",

        tk_tn_nb: "Phần Thống kê — Trắc nghiệm — Nhận biết",
        tk_tn_th: "Phần Thống kê — Trắc nghiệm — Thông hiểu",
        tk_tn_vd: "Phần Thống kê — Trắc nghiệm — Vận dụng",
        tk_tn_vdc: "Phần Thống kê — Trắc nghiệm — Vận dụng cao",
      };

      const parts = [];
      for (const key in mapping) {
        const val = parseInt(data[key]) || 0;
        if (val > 0) {
          parts.push(`${mapping[key]}: ${val} câu`);
        }
      }

      if (parts.length === 0) {
        return res.json({ result: "Không có yêu cầu tạo câu hỏi nào (tất cả ô = 0)." });
      }

      prompt = `Bạn là giáo viên Toán THCS. Hãy tạo các bài tập theo yêu cầu sau, trong ${programText}:\n\n${parts.map(p => "- " + p).join("\n")}
\nYêu cầu: mỗi câu ghi rõ phần (Xác suất/Thống kê), loại (Tự luận/Trắc nghiệm), mức độ; với trắc nghiệm cho 4 đáp án A–D và ghi đáp án đúng. Trình bày rõ ràng để dễ in/giao cho học sinh.`;
    } else {
      return res.status(400).json({ result: "Chế độ không hợp lệ." });
    }

    // gọi OpenAI Chat Completions
    const apiUrl = "https://api.openai.com/v1/chat/completions";

    const body = {
      model: "gpt-3.5-turbo", // hoặc đổi thành "gpt-4o-mini" nếu bạn có quyền
      messages: [
        { role: "system", content: "Bạn là giáo viên Toán THCS, soạn bài tập ngắn gọn, rõ ràng, phù hợp chương trình GDPT 2018." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1600
    };

    const fetchRes = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify(body)
    });

    const fetchJson = await fetchRes.json();

    if (!fetchRes.ok) {
      console.error("OpenAI error response:", fetchJson);
      return res.status(500).json({ result: "Lỗi từ OpenAI: " + (fetchJson.error?.message || fetchRes.statusText) });
    }

    const answer = fetchJson.choices?.[0]?.message?.content || "Không có kết quả từ OpenAI.";
    return res.json({ result: answer });

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ result: "Lỗi server khi gọi API." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
