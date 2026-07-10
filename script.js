const firstNames = ["Ana", "Bruno", "Carla", "Daniel", "Eduarda", "Felipe", "Gabriela", "Henrique", "Isabela", "Joao", "Karina", "Lucas", "Mariana", "Nicolas", "Olivia", "Pedro", "Rafaela", "Samuel", "Talita", "Vinicius", "Yasmin", "Caio", "Bianca", "Davi", "Helena"];
const lastNames = ["Silva", "Santos", "Oliveira", "Souza", "Pereira", "Costa", "Rodrigues", "Almeida", "Nascimento", "Lima", "Araujo", "Fernandes", "Carvalho", "Gomes", "Ribeiro", "Martins", "Barbosa", "Rocha", "Dias", "Teixeira"];
const parentNames = ["Maria", "Jose", "Patricia", "Carlos", "Fernanda", "Roberto", "Juliana", "Marcos", "Camila", "Ricardo", "Aline", "Paulo", "Luciana", "Andre", "Renata", "Sergio"];
const defaultRooms = ["1A", "1B", "2A", "2B", "3A", "3B", "6A", "6B", "6C", "7A", "7B", "8A", "8B", "9A", "9B"];
const storageKey = "agenda-escolar-contatos-v1";
const messageStorageKey = "agenda-escolar-mensagem-v1";
const defaultMessageTemplate = "Ola, estou entrando em contato pela escola Armando Gonçalves sobre o aluno {aluno}, da sala {sala}.";

let students = [];
let rooms = [];
let visibleRooms = [];
let editingStudentId = null;
let editingRoomName = null;
const openRooms = new Set();
const selectedStudentIds = new Set();

const roomsList = document.getElementById("roomsList");
const search = document.getElementById("search");
const roomFilter = document.getElementById("roomFilter");
const sortOrder = document.getElementById("sortOrder");
const rangeText = document.getElementById("rangeText");
const emptyState = document.getElementById("emptyState");
const totalStudents = document.getElementById("totalStudents");
const totalRooms = document.getElementById("totalRooms");
const visibleStudents = document.getElementById("visibleStudents");
const totalWhatsapp = document.getElementById("totalWhatsapp");
const studentForm = document.getElementById("studentForm");
const roomForm = document.getElementById("roomForm");
const studentClass = document.getElementById("studentClass");
const studentFormTitle = document.getElementById("studentFormTitle");
const saveStudentButton = document.getElementById("saveStudentButton");
const cancelStudentEdit = document.getElementById("cancelStudentEdit");
const roomFormTitle = document.getElementById("roomFormTitle");
const roomName = document.getElementById("roomName");
const saveRoomButton = document.getElementById("saveRoomButton");
const cancelRoomEdit = document.getElementById("cancelRoomEdit");
const attendanceRoom = document.getElementById("attendanceRoom");
const attendanceMonth = document.getElementById("attendanceMonth");
const attendanceYear = document.getElementById("attendanceYear");
const exportAttendance = document.getElementById("exportAttendance");
const messageTemplate = document.getElementById("messageTemplate");

function pad(value, size) {
  return String(value).padStart(size, "0");
}

function buildPhone(index) {
  const ddd = 11 + (index % 9);
  const middle = 7000 + ((index * 37) % 2600);
  const end = 1000 + ((index * 83) % 8900);
  return `+55 ${ddd} 9${middle}-${end}`;
}

function cleanPhone(phone) {
  let digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalize(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function sortRooms(list) {
  return [...list].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" }));
}

function buildStudents() {
  const items = [];
  for (let i = 1; i <= 500; i++) {
    const first = firstNames[(i * 3) % firstNames.length];
    const last = lastNames[(i * 7) % lastNames.length];
    const secondLast = lastNames[(i * 11) % lastNames.length];
    const parentA = parentNames[(i * 5) % parentNames.length];
    const parentB = parentNames[(i * 9 + 3) % parentNames.length];
    const family = lastNames[(i * 13) % lastNames.length];
    
    const year = 2010 + (i % 10);
    const month = 1 + (i % 12);
    const day = 1 + (i % 28);
    const birthDate = `${year}-${pad(month, 2)}-${pad(day, 2)}`;

    items.push({
      id: i,
      className: defaultRooms[(i - 1) % defaultRooms.length],
      studentNumber: (i % 40) + 1,
      studentName: `${first} ${last} ${secondLast}`,
      schoolDoc: `ESC-2026-${pad(i, 4)}`,
      birthDate: birthDate,
      parentsName: `${parentA} ${family} e ${parentB} ${family}`,
      contactName: `${parentA} ${family}`,
      contactPhone: buildPhone(i),
      createdAt: Date.now() - (500 - i) * 1000
    });
  }
  return items;
}

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (saved && Array.isArray(saved.students) && Array.isArray(saved.rooms)) {
      students = saved.students;
      rooms = sortRooms([...new Set([...saved.rooms, ...saved.students.map(item => item.className)])]);
      return;
    }
  } catch (error) {
    console.warn("Nao foi possivel carregar a agenda salva.", error);
  }
  students = buildStudents();
  rooms = sortRooms(defaultRooms);
}

function saveData() {
  localStorage.setItem(storageKey, JSON.stringify({ students, rooms }));
}

function buildMessage(item) {
  const template = messageTemplate.value.trim() || defaultMessageTemplate;
  return template
    .replaceAll("{aluno}", item.studentName)
    .replaceAll("{sala}", item.className)
    .replaceAll("{responsavel}", item.contactName)
    .replaceAll("{telefone}", item.contactPhone);
}

function whatsappLink(item) {
  const message = encodeURIComponent(buildMessage(item));
  const phone = cleanPhone(item.contactPhone);
  if (phone.length < 12) return "";
  return `https://wa.me/${phone}?text=${message}`;
}

function populateRoomOptions() {
  const selectedFilter = roomFilter.value;
  const selectedStudentRoom = studentClass.value;
  const selectedAttendanceRoom = attendanceRoom.value;
  const options = rooms.map(room => `<option value="${escapeHtml(room)}">${escapeHtml(room)}</option>`).join("");
  roomFilter.innerHTML = `<option value="">Todas</option>${options}`;
  studentClass.innerHTML = options || `<option value="">Cadastre uma sala primeiro</option>`;
  attendanceRoom.innerHTML = options || `<option value="">Cadastre uma sala primeiro</option>`;
  roomFilter.value = rooms.includes(selectedFilter) ? selectedFilter : "";
  studentClass.value = rooms.includes(selectedStudentRoom) ? selectedStudentRoom : (rooms[0] || "");
  attendanceRoom.value = rooms.includes(selectedAttendanceRoom) ? selectedAttendanceRoom : (rooms[0] || "");
  totalRooms.textContent = rooms.length;
}

function getFilteredGroups() {
  const term = normalize(search.value);
  const selectedRoom = roomFilter.value;
  const order = sortOrder.value;

  return rooms
    .filter(room => !selectedRoom || room === selectedRoom)
    .map(room => {
      let roomStudents = students.filter(item => {
        if (item.className !== room) return false;
        const haystack = normalize(`${item.className} ${item.studentName} ${item.schoolDoc} ${item.parentsName} ${item.contactName} ${item.contactPhone} ${item.studentNumber}`);
        return !term || haystack.includes(term) || normalize(room).includes(term);
      });

      if (order === "alphabetical") {
        roomStudents.sort((a, b) => a.studentName.localeCompare(b.studentName, "pt-BR"));
      } else if (order === "number") {
        roomStudents.sort((a, b) => (Number(a.studentNumber) || 0) - (Number(b.studentNumber) || 0));
      } else {
        roomStudents.sort((a, b) => (a.createdAt || a.id) - (b.createdAt || b.id));
      }

      return { room, students: roomStudents };
    })
    .filter(group => !term || group.students.length || normalize(group.room).includes(term));
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function render() {
  populateRoomOptions();
  visibleRooms = getFilteredGroups();
  const visibleCount = visibleRooms.reduce((sum, group) => sum + group.students.length, 0);

  roomsList.innerHTML = visibleRooms.map(group => {
    const isOpen = openRooms.has(group.room) || visibleRooms.length === 1 || search.value.trim();
    if (isOpen) openRooms.add(group.room);
    
    // Check if any student in this room is selected
    const selectedCountInRoom = group.students.filter(s => selectedStudentIds.has(String(s.id))).length;
    const canEdit = selectedCountInRoom === 1;
    const canDelete = selectedCountInRoom > 0;

    const body = group.students.length ? `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="checkbox-cell"></th>
              <th>Nº</th>
              <th>Aluno</th>
              <th>Nascimento</th>
              <th>Documento escolar</th>
              <th>Pais</th>
              <th>Contato telefônico</th>
              <th>Número (WhatsApp)</th>
            </tr>
          </thead>
          <tbody>
            ${group.students.map(item => {
              const link = whatsappLink(item);
              const isSelected = selectedStudentIds.has(String(item.id));
              return `
                <tr class="${isSelected ? "is-selected" : ""}">
                  <td class="checkbox-cell">
                    <input type="checkbox" data-action="select-student" data-id="${item.id}" ${isSelected ? "checked" : ""}>
                  </td>
                  <td><span class="small">${item.studentNumber || "-"}</span></td>
                  <td><strong>${escapeHtml(item.studentName)}</strong></td>
                  <td>${formatDate(item.birthDate)}</td>
                  <td><span class="doc">${escapeHtml(item.schoolDoc)}</span></td>
                  <td>${escapeHtml(item.parentsName)}</td>
                  <td>${escapeHtml(item.contactName)}</td>
                  <td>
                    ${link 
                      ? `<a href="${link}" target="_blank" class="phone-link" title="Clique para enviar WhatsApp">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.272l-.582 2.128 2.185-.573c.948.517 1.947.887 3.145.887 3.181 0 5.767-2.586 5.767-5.766 0-3.18-2.586-5.766-5.766-5.766zm3.375 8.202c-.147.415-.752.762-1.037.807-.246.038-.568.069-1.502-.321-1.123-.469-1.853-1.611-1.91-1.686-.057-.075-.461-.613-.461-1.17s.291-.83.395-.944c.104-.114.226-.142.301-.142s.15.001.215.006c.068.005.16-.025.251.196.104.253.356.868.387.931.031.063.051.137.009.221-.042.084-.063.137-.126.211-.063.074-.132.165-.189.221-.063.063-.129.132-.056.259.073.126.324.536.696.868.479.427.883.56 1.01.623.127.063.201.053.276-.032.075-.085.321-.375.406-.503.085-.128.17-.107.287-.063.117.044.743.351.871.415.127.064.212.096.244.15.031.054.031.311-.116.726z"/></svg>
                          ${escapeHtml(item.contactPhone)}
                         </a>`
                      : `<span class="phone" title="Número inválido">${escapeHtml(item.contactPhone)}</span>`
                    }
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    ` : `<div class="empty">Esta sala ainda nao possui alunos cadastrados.</div>`;

    return `
      <article class="room ${isOpen ? "is-open" : ""}" data-room="${escapeHtml(group.room)}">
        <button class="room-summary" type="button" data-action="toggle-room" data-room="${escapeHtml(group.room)}" aria-expanded="${isOpen}">
          <span class="chevron" aria-hidden="true">&gt;</span>
          <span class="room-title">
            <span class="room-name">${escapeHtml(group.room)}</span>
            <span class="small">${group.students.length} aluno${group.students.length === 1 ? "" : "s"}</span>
          </span>
          <span class="small">Abrir/fechar</span>
        </button>
        <div class="room-body">
          <div class="room-toolbar">
            <span class="small">Gerenciar sala ${escapeHtml(group.room)}</span>
            <div class="actions">
              <button class="btn small-btn primary" type="button" data-action="add-student-room" data-room="${escapeHtml(group.room)}">Adicionar aluno</button>
              <button class="btn small-btn" type="button" data-action="edit-room" data-room="${escapeHtml(group.room)}">Editar sala</button>
              <button class="btn small-btn danger" type="button" data-action="delete-room" data-room="${escapeHtml(group.room)}">Excluir sala</button>
              
              <div class="room-actions-group">
                <button class="btn small-btn" type="button" data-action="edit-selected" ${!canEdit ? "disabled" : ""} title="${canEdit ? "Editar aluno selecionado" : "Selecione exatamente 1 aluno para editar"}">Editar Aluno</button>
                <button class="btn small-btn danger" type="button" data-action="delete-selected" ${!canDelete ? "disabled" : ""} title="${canDelete ? "Excluir selecionados" : "Selecione alunos para excluir"}">Excluir Aluno</button>
              </div>
            </div>
          </div>
          ${body}
        </div>
      </article>
    `;
  }).join("");

  emptyState.classList.toggle("hidden", visibleRooms.length > 0);
  rangeText.textContent = `Mostrando ${visibleRooms.length} sala${visibleRooms.length === 1 ? "" : "s"} e ${visibleCount} aluno${visibleCount === 1 ? "" : "s"}`;
  totalStudents.textContent = students.length;
  visibleStudents.textContent = visibleCount;
  totalWhatsapp.textContent = students.length;
}

function resetStudentForm(room = "") {
  editingStudentId = null;
  studentForm.reset();
  studentFormTitle.textContent = "Novo aluno";
  saveStudentButton.textContent = "Adicionar aluno";
  cancelStudentEdit.classList.add("hidden");
  studentClass.value = rooms.includes(room) ? room : (rooms[0] || "");
}

function resetRoomForm() {
  editingRoomName = null;
  roomForm.reset();
  roomFormTitle.textContent = "Nova sala";
  saveRoomButton.textContent = "Adicionar sala";
  cancelRoomEdit.classList.add("hidden");
}

function startStudentEdit(id) {
  const item = students.find(student => String(student.id) === String(id));
  if (!item) return;
  editingStudentId = item.id;
  studentFormTitle.textContent = "Editar aluno";
  saveStudentButton.textContent = "Salvar alteracoes";
  cancelStudentEdit.classList.remove("hidden");
  studentClass.value = item.className;
  document.getElementById("studentNumber").value = item.studentNumber || "";
  document.getElementById("schoolDoc").value = item.schoolDoc;
  document.getElementById("birthDate").value = item.birthDate || "";
  document.getElementById("studentName").value = item.studentName;
  document.getElementById("parentsName").value = item.parentsName;
  document.getElementById("contactName").value = item.contactName;
  document.getElementById("contactPhone").value = item.contactPhone;
  document.getElementById("formPanel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteStudents(ids) {
  const toDelete = students.filter(s => ids.has(String(s.id)));
  if (!toDelete.length) return;
  
  const names = toDelete.map(s => s.studentName).join(", ");
  if (!confirm(`Excluir ${toDelete.length} aluno(s): ${names}?`)) return;
  
  students = students.filter(s => !ids.has(String(s.id)));
  ids.forEach(id => {
    if (String(editingStudentId) === id) resetStudentForm();
    selectedStudentIds.delete(id);
  });
  
  saveData();
  render();
}

function startRoomEdit(room) {
  editingRoomName = room;
  roomName.value = room;
  roomFormTitle.textContent = "Editar sala";
  saveRoomButton.textContent = "Salvar sala";
  cancelRoomEdit.classList.remove("hidden");
  document.getElementById("formPanel").scrollIntoView({ behavior: "smooth", block: "start" });
  roomName.focus();
}

function deleteRoom(room) {
  const count = students.filter(item => item.className === room).length;
  const message = count
    ? `Excluir a sala ${room} e tambem ${count} aluno${count === 1 ? "" : "s"} dessa sala?`
    : `Excluir a sala ${room}?`;
  if (!confirm(message)) return;
  rooms = rooms.filter(r => r !== room);
  students = students.filter(item => item.className !== room);
  openRooms.delete(room);
  if (editingRoomName === room) resetRoomForm();
  if (studentClass.value === room) resetStudentForm();
  saveData();
  render();
}

function addStudentForRoom(room) {
  resetStudentForm(room);
  openRooms.add(room);
  document.getElementById("formPanel").scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById("studentName").focus();
}

function exportCsv() {
  const groups = getFilteredGroups();
  const rows = groups.flatMap(group => group.students);
  const header = ["Sala", "Nº", "Nome do aluno", "Data de Nascimento", "Documento escolar", "Nome dos pais", "Nome do contato telefonico", "Numero do contato telefonico"];
  const lines = [header, ...rows.map(item => [
    item.className,
    item.studentNumber || "",
    item.studentName,
    formatDate(item.birthDate),
    item.schoolDoc,
    item.parentsName,
    item.contactName,
    item.contactPhone
  ])];
  const csv = lines.map(line => line.map(value => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "contatos-alunos-escola.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function columnName(index) {
  let name = "";
  while (index > 0) {
    const mod = (index - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    index = Math.floor((index - mod) / 26);
  }
  return name;
}

function getSchoolDays(year, month) {
  const days = [];
  const lastDay = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, month, day);
    const weekDay = date.getDay();
    if (weekDay !== 0 && weekDay !== 6) {
      days.push(day);
    }
  }
  return days;
}

function sheetCell(ref, value, style = 0) {
  const styleAttr = style ? ` s="${style}"` : "";
  return `<c r="${ref}" t="inlineStr"${styleAttr}><is><t>${escapeXml(value)}</t></is></c>`;
}

function sheetRow(number, cells) {
  return `<row r="${number}">${cells.join("")}</row>`;
}

function buildAttendanceSheetXml(room, month, year) {
  const monthNames = ["Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const days = getSchoolDays(year, month);
  const roomStudents = students
    .filter(item => item.className === room)
    .sort((a, b) => (Number(a.studentNumber) || 0) - (Number(b.studentNumber) || 0));
  
  const lastColumn = columnName(3 + days.length);
  const lastRow = Math.max(4, roomStudents.length + 3);
  const rowsXml = [];

  rowsXml.push(sheetRow(1, [
    sheetCell("A1", `Frequencia - Sala ${room} - ${monthNames[month]} de ${year}`, 1)
  ]));
  rowsXml.push(sheetRow(2, [
    sheetCell("A2", "Legenda: P = Presente | A = Ausente | F = Feriado", 4)
  ]));

  const headerCells = [
    sheetCell("A3", "Nº", 2),
    sheetCell("B3", "Nome do aluno", 2),
    sheetCell("C3", "Nascimento", 2)
  ];
  days.forEach((day, index) => {
    headerCells.push(sheetCell(`${columnName(index + 4)}3`, String(day).padStart(2, "0"), 2));
  });
  rowsXml.push(sheetRow(3, headerCells));

  roomStudents.forEach((item, index) => {
    const rowNumber = index + 4;
    const cells = [
      sheetCell(`A${rowNumber}`, String(item.studentNumber || ""), 4),
      sheetCell(`B${rowNumber}`, item.studentName, 4),
      sheetCell(`C${rowNumber}`, formatDate(item.birthDate), 4)
    ];
    days.forEach((day, dayIndex) => {
      cells.push(sheetCell(`${columnName(dayIndex + 4)}${rowNumber}`, "", 3));
    });
    rowsXml.push(sheetRow(rowNumber, cells));
  });

  const validationRange = days.length && roomStudents.length
    ? `<dataValidations count="1"><dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="D4:${lastColumn}${lastRow}"><formula1>"P,A,F"</formula1></dataValidation></dataValidations>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:${lastColumn}${lastRow}"/>
  <sheetViews><sheetView workbookViewId="0"><pane xSplit="3" ySplit="3" topLeftCell="D4" activePane="bottomRight" state="frozen"/></sheetView></sheetViews>
  <cols><col min="1" max="1" width="6" customWidth="1"/><col min="2" max="2" width="34" customWidth="1"/><col min="3" max="3" width="14" customWidth="1"/><col min="4" max="${3 + days.length}" width="4" customWidth="1"/></cols>
  <sheetData>${rowsXml.join("")}</sheetData>
  <mergeCells count="2"><mergeCell ref="A1:${lastColumn}1"/><mergeCell ref="A2:${lastColumn}2"/></mergeCells>
  ${validationRange}
</worksheet>`;
}

function buildWorkbookFiles(room, month, year) {
  const worksheet = buildAttendanceSheetXml(room, month, year);
  return {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Frequencia" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    "xl/styles.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>
  <fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF469BD3"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEAF6FD"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD9E4EE"/></left><right style="thin"><color rgb="FFD9E4EE"/></right><top style="thin"><color rgb="FFD9E4EE"/></top><bottom style="thin"><color rgb="FFD9E4EE"/></bottom><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="5">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`,
    "xl/worksheets/sheet1.xml": worksheet
  };
}

function crc32(bytes) {
  let crc = -1;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 255];
  }
  return (crc ^ -1) >>> 0;
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function writeUint16(bytes, value) {
  bytes.push(value & 255, (value >>> 8) & 255);
}

function writeUint32(bytes, value) {
  bytes.push(value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255);
}

function textBytes(text) {
  return new TextEncoder().encode(text);
}

function createZip(files) {
  const fileBytes = [];
  const centralBytes = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  Object.entries(files).forEach(([name, content]) => {
    const nameBytes = textBytes(name);
    const dataBytes = textBytes(content);
    const crc = crc32(dataBytes);
    const localOffset = offset;

    writeUint32(fileBytes, 0x04034b50);
    writeUint16(fileBytes, 20);
    writeUint16(fileBytes, 0);
    writeUint16(fileBytes, 0);
    writeUint16(fileBytes, dosTime);
    writeUint16(fileBytes, dosDate);
    writeUint32(fileBytes, crc);
    writeUint32(fileBytes, dataBytes.length);
    writeUint32(fileBytes, dataBytes.length);
    writeUint16(fileBytes, nameBytes.length);
    writeUint16(fileBytes, 0);
    fileBytes.push(...nameBytes, ...dataBytes);
    offset = fileBytes.length;

    writeUint32(centralBytes, 0x02014b50);
    writeUint16(centralBytes, 20);
    writeUint16(centralBytes, 20);
    writeUint16(centralBytes, 0);
    writeUint16(centralBytes, 0);
    writeUint16(centralBytes, dosTime);
    writeUint16(centralBytes, dosDate);
    writeUint32(centralBytes, crc);
    writeUint32(centralBytes, dataBytes.length);
    writeUint32(centralBytes, dataBytes.length);
    writeUint16(centralBytes, nameBytes.length);
    writeUint16(centralBytes, 0);
    writeUint16(centralBytes, 0);
    writeUint16(centralBytes, 0);
    writeUint16(centralBytes, 0);
    writeUint32(centralBytes, 0);
    writeUint32(centralBytes, localOffset);
    centralBytes.push(...nameBytes);
  });

  const centralOffset = fileBytes.length;
  const centralSize = centralBytes.length;
  const endBytes = [];
  writeUint32(endBytes, 0x06054b50);
  writeUint16(endBytes, 0);
  writeUint16(endBytes, 0);
  writeUint16(endBytes, Object.keys(files).length);
  writeUint16(endBytes, Object.keys(files).length);
  writeUint32(endBytes, centralSize);
  writeUint32(endBytes, centralOffset);
  writeUint16(endBytes, 0);

  return new Uint8Array([...fileBytes, ...centralBytes, ...endBytes]);
}

function exportAttendanceXlsx() {
  const room = attendanceRoom.value;
  const month = Number(attendanceMonth.value);
  const year = Number(attendanceYear.value);
  if (!room) {
    alert("Escolha uma sala para gerar a planilha.");
    return;
  }
  const roomStudents = students.filter(item => item.className === room);
  if (!roomStudents.length && !confirm("Esta sala ainda nao possui alunos. Gerar planilha mesmo assim?")) return;

  const files = buildWorkbookFiles(room, month, year);
  const zip = createZip(files);
  const blob = new Blob([zip], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `frequencia-${room}-${String(month + 1).padStart(2, "0")}-${year}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

roomsList.addEventListener("click", event => {
  const trigger = event.target.closest("[data-action]");
  if (!trigger) return;
  const action = trigger.dataset.action;
  const room = trigger.dataset.room;
  const id = trigger.dataset.id;

  if (action === "toggle-room") {
    openRooms.has(room) ? openRooms.delete(room) : openRooms.add(room);
    render();
  }
  if (action === "add-student-room") addStudentForRoom(room);
  if (action === "edit-room") startRoomEdit(room);
  if (action === "delete-room") deleteRoom(room);
  
  if (action === "select-student") {
    if (trigger.checked) {
      selectedStudentIds.add(String(id));
    } else {
      selectedStudentIds.delete(String(id));
    }
    render();
  }
  
  if (action === "edit-selected") {
    if (selectedStudentIds.size === 1) {
      const idToEdit = Array.from(selectedStudentIds)[0];
      startStudentEdit(idToEdit);
    }
  }
  
  if (action === "delete-selected") {
    if (selectedStudentIds.size > 0) {
      deleteStudents(selectedStudentIds);
    }
  }
});

search.addEventListener("input", render);
roomFilter.addEventListener("change", render);
sortOrder.addEventListener("change", render);
messageTemplate.addEventListener("input", () => {
  localStorage.setItem(messageStorageKey, messageTemplate.value);
  render();
});

document.getElementById("clearFilters").addEventListener("click", () => {
  search.value = "";
  roomFilter.value = "";
  sortOrder.value = "insertion";
  selectedStudentIds.clear();
  render();
});

document.getElementById("exportCsv").addEventListener("click", exportCsv);
document.getElementById("exportCsvTop").addEventListener("click", exportCsv);
exportAttendance.addEventListener("click", exportAttendanceXlsx);
document.getElementById("scrollForm").addEventListener("click", () => {
  resetStudentForm();
  document.getElementById("formPanel").scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById("studentName").focus({ preventScroll: true });
});

roomForm.addEventListener("submit", event => {
  event.preventDefault();
  const newRoom = roomName.value.trim().toUpperCase();
  if (!newRoom) return;
  const duplicate = rooms.some(room => normalize(room) === normalize(newRoom) && normalize(room) !== normalize(editingRoomName));
  if (duplicate) {
    alert("Essa sala ja existe.");
    return;
  }

  if (editingRoomName) {
    rooms = rooms.map(room => room === editingRoomName ? newRoom : room);
    students = students.map(item => item.className === editingRoomName ? { ...item, className: newRoom } : item);
    if (openRooms.has(editingRoomName)) {
      openRooms.delete(editingRoomName);
      openRooms.add(newRoom);
    }
  } else {
    rooms = [...rooms, newRoom];
    openRooms.add(newRoom);
  }

  rooms = sortRooms([...new Set(rooms)]);
  resetRoomForm();
  saveData();
  render();
});

cancelRoomEdit.addEventListener("click", resetRoomForm);

studentForm.addEventListener("submit", event => {
  event.preventDefault();
  if (!rooms.length) {
    alert("Cadastre uma sala antes de adicionar alunos.");
    return;
  }
  
  const studentId = editingStudentId || Date.now();
  const createdAt = editingStudentId ? (students.find(s => s.id === editingStudentId)?.createdAt || Date.now()) : Date.now();

  const item = {
    id: studentId,
    createdAt: createdAt,
    className: studentClass.value,
    studentNumber: document.getElementById("studentNumber").value,
    studentName: document.getElementById("studentName").value.trim(),
    schoolDoc: document.getElementById("schoolDoc").value.trim(),
    birthDate: document.getElementById("birthDate").value,
    parentsName: document.getElementById("parentsName").value.trim(),
    contactName: document.getElementById("contactName").value.trim(),
    contactPhone: document.getElementById("contactPhone").value.trim()
  };

  if (editingStudentId) {
    students = students.map(student => String(student.id) === String(editingStudentId) ? item : student);
    selectedStudentIds.clear(); // Clear selection after edit
  } else {
    students = [item, ...students];
  }

  openRooms.add(item.className);
  resetStudentForm(item.className);
  saveData();
  render();
});

cancelStudentEdit.addEventListener("click", () => resetStudentForm());

loadData();
messageTemplate.value = localStorage.getItem(messageStorageKey) || messageTemplate.value || defaultMessageTemplate;
const today = new Date();
attendanceMonth.value = String(today.getMonth());
attendanceYear.value = String(today.getFullYear());
rooms.forEach((room, index) => {
  if (index < 2) openRooms.add(room);
});
render();
