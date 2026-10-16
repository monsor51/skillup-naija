document.addEventListener("DOMContentLoaded", async () => {
  const loginPanel = document.getElementById("loginPanel");
  const dashboard = document.getElementById("dashboard");
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginMsg = document.getElementById("loginMsg");
  const adminPass = document.getElementById("adminPass");
  const searchBox = document.getElementById("searchBox");
  const courseFilter = document.getElementById("courseFilter");
  const paidFilter = document.getElementById("paidFilter");
  const exportBtn = document.getElementById("exportBtn");
  const regBody = document.getElementById("regBody");
  const emptyMsg = document.getElementById("emptyMsg");

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>\"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m]));
  }

  async function checkSession() {
    try {
      const res = await fetch("/api/admin/session");
      const data = await res.json();
      if (data.loggedIn) {
        loginPanel.classList.add("hidden");
        dashboard.classList.remove("hidden");
        loadDashboard();
      } else {
        loginPanel.classList.remove("hidden");
        dashboard.classList.add("hidden");
      }
    } catch (err) { console.error(err); }
  }

  async function loadDashboard() {
    const params = new URLSearchParams();
    const search = searchBox.value.trim();
    const course = courseFilter.value;
    const paid = paidFilter.value;
    if (search) params.set("search", search);
    if (course) params.set("course", course);
    if (paid) params.set("paid", paid);

    try {
      const res = await fetch(`/api/admin/registrations?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) { alert(data.message || "Failed to load registrations."); return; }

      regBody.innerHTML = "";
      if (!data.registrations.length) { emptyMsg.classList.remove("hidden"); return; }
      emptyMsg.classList.add("hidden");

      const courses = [...new Set(data.registrations.map(r => r.course).filter(Boolean))].sort();
      courseFilter.innerHTML = '<option value="">All Skills</option>';
      courses.forEach(c => { const opt = document.createElement("option"); opt.value = c; opt.textContent = c; courseFilter.appendChild(opt); });

      data.registrations.forEach((r, idx) => {
        const tr = document.createElement("tr");
        const tdIndex = document.createElement("td"); tdIndex.textContent = String(idx + 1); tr.appendChild(tdIndex);
        const tdName = document.createElement("td"); tdName.innerHTML = `<strong>${escapeHtml(r.surname || "")} ${escapeHtml(r.firstName || "")}</strong>`; tr.appendChild(tdName);
        const tdPhone = document.createElement("td"); tdPhone.textContent = r.phone || ""; tr.appendChild(tdPhone);
        const tdCourse = document.createElement("td"); tdCourse.textContent = r.course || ""; tr.appendChild(tdCourse);
        const tdDate = document.createElement("td"); tdDate.textContent = new Date(r.submittedAt).toLocaleDateString("en-NG"); tr.appendChild(tdDate);
        const tdStatus = document.createElement("td"); const statusEl = document.createElement("span"); statusEl.textContent = r.paid ? "Paid" : "Unpaid"; statusEl.className = r.paid ? "status-paid" : "status-unpaid"; tdStatus.appendChild(statusEl); tr.appendChild(tdStatus);
        const tdActions = document.createElement("td");

        const viewBtn = document.createElement("button"); viewBtn.textContent = "View"; viewBtn.onclick = () => {
          const details = [
            `Name: ${r.surname || ""} ${r.firstName || ""}`,
            `Phone: ${r.phone || ""}`,
            `Email: ${r.email || ""}`,
            `Course: ${r.course || ""}`,
            `Address: ${r.address || ""}`,
            `Paid: ${r.paid ? "Yes" : "No"}`
          ].join("\n");
          alert(details);
        };
        tdActions.appendChild(viewBtn);

        const toggleBtn = document.createElement("button"); toggleBtn.textContent = r.paid ? "Mark Unpaid" : "Mark Paid"; toggleBtn.onclick = async () => {
          const res = await fetch(`/api/admin/registrations/${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paid: !r.paid }) });
          const data = await res.json(); if (res.ok) loadDashboard(); else alert(data.message || "Update failed");
        };
        tdActions.appendChild(toggleBtn);

        const deleteBtn = document.createElement("button"); deleteBtn.textContent = "Delete"; deleteBtn.onclick = async () => {
          if (!confirm("Delete this registration?")) return; const res = await fetch(`/api/admin/registrations/${r.id}`, { method: "DELETE" }); const data = await res.json(); if (res.ok) loadDashboard(); else alert(data.message || "Delete failed");
        };
        tdActions.appendChild(deleteBtn);

        tr.appendChild(tdActions);
        regBody.appendChild(tr);
      });

    } catch (err) { console.error(err); alert("Could not load registrations."); }
  }

  loginBtn.addEventListener("click", async () => {
    const password = adminPass.value.trim(); if (!password) { loginMsg.textContent = "Enter password"; loginMsg.style.color = "#dc2626"; return; }
    try {
      const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await res.json(); loginMsg.textContent = data.message || "Login failed"; loginMsg.style.color = res.ok ? "#16a34a" : "#dc2626"; if (res.ok) { adminPass.value = ""; loginPanel.classList.add("hidden"); dashboard.classList.remove("hidden"); loadDashboard(); }
    } catch (err) { console.error(err); loginMsg.textContent = "Login failed"; loginMsg.style.color = "#dc2626"; }
  });

  logoutBtn.addEventListener("click", async () => { await fetch("/api/admin/logout", { method: "POST" }); location.reload(); });
  searchBox.addEventListener("input", loadDashboard); courseFilter.addEventListener("change", loadDashboard); paidFilter.addEventListener("change", loadDashboard);
  exportBtn.addEventListener("click", () => { window.location.href = "/api/admin/export.csv"; });
  checkSession();
});
