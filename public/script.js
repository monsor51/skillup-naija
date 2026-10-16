document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("enrollForm");
  const select = document.getElementById("courseSelect");
  const msg = document.getElementById("formMsg");

  async function loadCourses() {
    try {
      const res = await fetch("/api/courses");
      const data = await res.json();
      select.innerHTML = '<option value="">-- Choose One Skill --</option>';
      data.courses.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.title;
        opt.textContent = `${c.title} — ${c.category}`;
        select.appendChild(opt);
      });
    } catch (err) {
      select.innerHTML = '<option value="">Could not load skills</option>';
      console.error(err);
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";
    const payload = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      msg.textContent = result.message || (res.ok ? "Submitted" : "Submission failed");
      msg.style.color = res.ok ? "#16a34a" : "#dc2626";
      if (res.ok) form.reset();
    } catch (err) {
      msg.textContent = "Network error.";
      msg.style.color = "#dc2626";
      console.error(err);
    }
  });

  loadCourses();
});
