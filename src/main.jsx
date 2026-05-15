import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { CalendarDays, Plus, Trash2, Download, Users, AlertCircle, Lock, Unlock } from "lucide-react";
import "./styles.css";

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const initialCountries = ["Россия", "Беларусь"];
const initialDepartments = ["Продажи", "Финансы", "HR", "Разработка"];
const ADMIN_PASSWORD = "admin123";

const uid = () => crypto.randomUUID();

const initialEmployees = [
  {
    id: uid(),
    lastName: "Иванов",
    department: "Продажи",
    country: "Россия",
    hiredAt: "2022-03-14",
    usedDays: 8,
    vacations: [
      { id: uid(), start: "2026-02-24", end: "2026-03-06" },
      { id: uid(), start: "2026-12-28", end: "2027-01-09" },
    ],
  },
  {
    id: uid(),
    lastName: "Петрова",
    department: "Финансы",
    country: "Беларусь",
    hiredAt: "2023-09-01",
    usedDays: 14,
    vacations: [{ id: uid(), start: "2025-12-29", end: "2026-01-10" }],
  },
];

function Button({ children, className = "", variant = "primary", ...props }) {
  return (
    <button className={`btn btn-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}

function Card({ children, className = "" }) {
  return <div className={`card ${className}`}>{children}</div>;
}

function toDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value) {
  if (!value) return "";
  return toDate(value).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

function daysInclusive(start, end) {
  const from = toDate(start);
  const to = toDate(end);
  if (!from || !to || to < from) return 0;
  return Math.floor((to - from) / 86400000) + 1;
}

function monthRange(year, monthIndex) {
  return {
    start: new Date(year, monthIndex, 1),
    end: new Date(year, monthIndex + 1, 0),
  };
}

function overlapsMonth(vacation, year, monthIndex) {
  const vacationStart = toDate(vacation.start);
  const vacationEnd = toDate(vacation.end);
  if (!vacationStart || !vacationEnd || vacationEnd < vacationStart) return null;

  const { start: monthStart, end: monthEnd } = monthRange(year, monthIndex);
  const overlapStart = vacationStart > monthStart ? vacationStart : monthStart;
  const overlapEnd = vacationEnd < monthEnd ? vacationEnd : monthEnd;

  if (overlapEnd < overlapStart) return null;

  return {
    start: overlapStart,
    end: overlapEnd,
    startsOutsideMonth: vacationStart < monthStart,
    endsOutsideMonth: vacationEnd > monthEnd,
  };
}

function isPastVacation(vacation) {
  const end = toDate(vacation.end);
  if (!end) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return end < today;
}

function formatRangePart(part, vacation) {
  if (isPastVacation(vacation)) {
    return `${daysInclusive(vacation.start, vacation.end)} к.дн.`;
  }

  const options = { day: "2-digit", month: "2-digit" };
  return `${part.startsOutsideMonth ? "← " : ""}${part.start.toLocaleDateString("ru-RU", options)}–${part.end.toLocaleDateString("ru-RU", options)}${part.endsOutsideMonth ? " →" : ""}`;
}

function calculateRemainingDays(employee) {
  // TODO: заменить на вашу формулу.
  const annualDays = employee.country === "Беларусь" ? 24 : 28;
  return Math.max(annualDays - Number(employee.usedDays || 0), 0);
}

function calculatePlannedDays(employee) {
  return employee.vacations
    .filter((vacation) => !isPastVacation(vacation))
    .reduce((sum, vacation) => sum + daysInclusive(vacation.start, vacation.end), 0);
}

function downloadJson(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "vacations.json";
  link.click();
  URL.revokeObjectURL(url);
}

function DirectoryEditor({ title, items, placeholder, onAdd, onRemove, disabled }) {
  const [value, setValue] = useState("");

  const addItem = () => {
    if (disabled) return;
    const normalized = value.trim();
    if (!normalized || items.includes(normalized)) return;
    onAdd(normalized);
    setValue("");
  };

  return (
    <div className="directory">
      <div className="directory-title">{title}</div>
      <div className="inline-form">
        <input
          value={value}
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && addItem()}
          placeholder={placeholder}
        />
        <Button type="button" variant="secondary" onClick={addItem} disabled={disabled}>
          <Plus size={16} />
        </Button>
      </div>
      <div className="chips">
        {items.map((item) => (
          <span key={item} className="chip">
            {item}
            <button type="button" disabled={disabled} onClick={() => onRemove(item)} aria-label={`Удалить ${item}`}>
              <Trash2 size={12} />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function VacationEditor({ employee, onChange, adminUnlocked }) {
  const updateVacation = (vacationId, field, value) => {
    const currentVacation = employee.vacations.find((vacation) => vacation.id === vacationId);
    if (!adminUnlocked && currentVacation && isPastVacation(currentVacation)) return;

    onChange({
      ...employee,
      vacations: employee.vacations.map((vacation) =>
        vacation.id === vacationId ? { ...vacation, [field]: value } : vacation
      ),
    });
  };

  const addVacation = () => {
    onChange({
      ...employee,
      vacations: [...employee.vacations, { id: uid(), start: "", end: "" }],
    });
  };

  const removeVacation = (vacationId) => {
    const currentVacation = employee.vacations.find((vacation) => vacation.id === vacationId);
    if (!adminUnlocked && currentVacation && isPastVacation(currentVacation)) return;

    onChange({
      ...employee,
      vacations: employee.vacations.filter((vacation) => vacation.id !== vacationId),
    });
  };

  return (
    <div className="vacation-list">
      {employee.vacations.map((vacation) => {
        const invalid = vacation.start && vacation.end && toDate(vacation.end) < toDate(vacation.start);
        const lockedFact = !adminUnlocked && isPastVacation(vacation);

        return (
          <div key={vacation.id} className="vacation-card">
            <div className="vacation-grid">
              <label>
                Начало
                <input
                  type="date"
                  value={vacation.start}
                  disabled={lockedFact}
                  onChange={(event) => updateVacation(vacation.id, "start", event.target.value)}
                />
              </label>
              <label>
                Конец
                <input
                  type="date"
                  value={vacation.end}
                  disabled={lockedFact}
                  onChange={(event) => updateVacation(vacation.id, "end", event.target.value)}
                />
              </label>
              <Button type="button" variant="outline" disabled={lockedFact} onClick={() => removeVacation(vacation.id)}>
                <Trash2 size={16} />
              </Button>
            </div>
            {lockedFact && <div className="hint"><Lock size={14} /> Фактический отпуск редактируется только под паролем</div>}
            {invalid && <div className="error"><AlertCircle size={14} /> Дата окончания раньше даты начала</div>}
          </div>
        );
      })}
      <Button type="button" variant="secondary" onClick={addVacation}>
        <Plus size={16} /> Добавить отпуск
      </Button>
    </div>
  );
}

function App() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [employees, setEmployees] = useState(initialEmployees);
  const [departments, setDepartments] = useState(initialDepartments);
  const [countries, setCountries] = useState(initialCountries);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(initialEmployees[0]?.id ?? null);
  const [password, setPassword] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);

  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId) ?? employees[0];

  const totals = useMemo(() => {
    const used = employees.reduce((sum, employee) => sum + Number(employee.usedDays || 0), 0);
    const remaining = employees.reduce((sum, employee) => sum + calculateRemainingDays(employee), 0);
    const planned = employees.reduce((sum, employee) => sum + calculatePlannedDays(employee), 0);
    return { used, remaining, planned };
  }, [employees]);

  const submitPassword = () => {
    if (password === ADMIN_PASSWORD) {
      setAdminUnlocked(true);
      setPassword("");
    }
  };

  const updateEmployee = (employeeId, patch) => {
    if (!adminUnlocked) return;
    setEmployees((current) => current.map((employee) => employee.id === employeeId ? { ...employee, ...patch } : employee));
  };

  const replaceEmployee = (updatedEmployee) => {
    setEmployees((current) => current.map((employee) => employee.id === updatedEmployee.id ? updatedEmployee : employee));
  };

  const addEmployee = () => {
    if (!adminUnlocked) return;
    const employee = {
      id: uid(),
      lastName: "Новый сотрудник",
      department: departments[0] ?? "",
      country: countries[0] ?? "",
      hiredAt: new Date().toISOString().slice(0, 10),
      usedDays: 0,
      vacations: [],
    };
    setEmployees((current) => [...current, employee]);
    setSelectedEmployeeId(employee.id);
  };

  const removeEmployee = (employeeId) => {
    if (!adminUnlocked) return;
    setEmployees((current) => current.filter((employee) => employee.id !== employeeId));
    if (selectedEmployeeId === employeeId) {
      setSelectedEmployeeId(employees.find((employee) => employee.id !== employeeId)?.id ?? null);
    }
  };

  const addDepartment = (department) => setDepartments((current) => adminUnlocked ? [...current, department] : current);
  const addCountry = (country) => setCountries((current) => adminUnlocked ? [...current, country] : current);

  const removeDepartment = (department) => {
    if (!adminUnlocked) return;
    setDepartments((current) => current.filter((item) => item !== department));
    setEmployees((current) => current.map((employee) => employee.department === department ? { ...employee, department: "" } : employee));
  };

  const removeCountry = (country) => {
    if (!adminUnlocked) return;
    setCountries((current) => current.filter((item) => item !== country));
    setEmployees((current) => current.map((employee) => employee.country === country ? { ...employee, country: "" } : employee));
  };

  const addVacationInMonth = (employeeId, monthIndex) => {
    const day = new Date(year, monthIndex, 1).toISOString().slice(0, 10);
    setEmployees((current) =>
      current.map((employee) =>
        employee.id === employeeId
          ? { ...employee, vacations: [...employee.vacations, { id: uid(), start: day, end: day }] }
          : employee
      )
    );
    setSelectedEmployeeId(employeeId);
  };

  return (
    <div className="page">
      <div className="shell">
        <header className="hero">
          <div>
            <div className="badge"><CalendarDays size={16} /> Планировщик отпусков</div>
            <h1>Отпуска сотрудников</h1>
            <p>
              Без пароля можно редактировать только планируемые отпуска. Сотрудники, отделы, страны,
              фактические отпуска и экспорт закрыты. Будущие отпуска показываются датами, прошедшие — количеством календарных дней.
            </p>
          </div>

          <div className="toolbar">
            <label className="year-control">
              Год
              <input type="number" value={year} onChange={(event) => setYear(Number(event.target.value))} />
            </label>

            <div className="password-box">
              {adminUnlocked ? <Unlock size={16} className="green" /> : <Lock size={16} />}
              {adminUnlocked ? (
                <Button variant="ghost" onClick={() => setAdminUnlocked(false)}>Выйти</Button>
              ) : (
                <>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && submitPassword()}
                    placeholder="Пароль"
                  />
                  <Button variant="secondary" onClick={submitPassword}>OK</Button>
                </>
              )}
            </div>

            <Button onClick={addEmployee} disabled={!adminUnlocked}><Plus size={16} /> Сотрудник</Button>
            <Button variant="outline" disabled={!adminUnlocked} onClick={() => downloadJson({ employees, departments, countries })}>
              <Download size={16} /> JSON
            </Button>
          </div>
        </header>

        <section className="stats">
          <Card><span>Сотрудников</span><strong>{employees.length} <Users size={22} /></strong></Card>
          <Card><span>Использовано дней</span><strong>{totals.used}</strong></Card>
          <Card><span>Осталось дней</span><strong>{totals.remaining}</strong></Card>
          <Card><span>Запланировано дней</span><strong>{totals.planned}</strong></Card>
        </section>

        <main className="layout">
          <Card className="table-card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Фамилия</th>
                    <th>Отдел</th>
                    <th>Страна</th>
                    <th>Трудоустройство</th>
                    <th>Использовано</th>
                    <th>Осталось</th>
                    <th>Запланировано</th>
                    {MONTHS.map((month) => <th key={month}>{month}</th>)}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id} className={selectedEmployee?.id === employee.id ? "selected" : ""} onClick={() => setSelectedEmployeeId(employee.id)}>
                      <td><input value={employee.lastName} disabled={!adminUnlocked} onChange={(e) => updateEmployee(employee.id, { lastName: e.target.value })} /></td>
                      <td>
                        <select value={employee.department} disabled={!adminUnlocked} onChange={(e) => updateEmployee(employee.id, { department: e.target.value })}>
                          <option value="">—</option>
                          {departments.map((department) => <option key={department}>{department}</option>)}
                        </select>
                      </td>
                      <td>
                        <select value={employee.country} disabled={!adminUnlocked} onChange={(e) => updateEmployee(employee.id, { country: e.target.value })}>
                          <option value="">—</option>
                          {countries.map((country) => <option key={country}>{country}</option>)}
                        </select>
                      </td>
                      <td><input type="date" value={employee.hiredAt} disabled={!adminUnlocked} onChange={(e) => updateEmployee(employee.id, { hiredAt: e.target.value })} /></td>
                      <td><input type="number" min="0" value={employee.usedDays} disabled={!adminUnlocked} onChange={(e) => updateEmployee(employee.id, { usedDays: e.target.value })} /></td>
                      <td className="number">{calculateRemainingDays(employee)}</td>
                      <td className="number">{calculatePlannedDays(employee)}</td>
                      {MONTHS.map((month, monthIndex) => {
                        const parts = employee.vacations
                          .map((vacation) => {
                            const part = overlapsMonth(vacation, year, monthIndex);
                            return part ? { part, vacation } : null;
                          })
                          .filter(Boolean);

                        return (
                          <td key={month} className="month-cell">
                            {parts.length === 0 ? (
                              <div className="empty-month">
                                <span>—</span>
                                <button type="button" onClick={(event) => { event.stopPropagation(); addVacationInMonth(employee.id, monthIndex); }} title="Добавить плановый отпуск">
                                  <Plus size={12} />
                                </button>
                              </div>
                            ) : (
                              <>
                                {parts.map(({ part, vacation }, index) => (
                                  <div
                                    key={index}
                                    className={`vacation-pill ${isPastVacation(vacation) ? "fact" : "plan"}`}
                                    title={isPastVacation(vacation) ? `${formatDate(vacation.start)}–${formatDate(vacation.end)}` : "Плановый отпуск"}
                                  >
                                    {formatRangePart(part, vacation)}
                                  </div>
                                ))}
                                <button type="button" className="add-interval" onClick={(event) => { event.stopPropagation(); addVacationInMonth(employee.id, monthIndex); }}>
                                  <Plus size={12} /> интервал
                                </button>
                              </>
                            )}
                          </td>
                        );
                      })}
                      <td>
                        <Button variant="ghost" disabled={!adminUnlocked} onClick={(event) => { event.stopPropagation(); removeEmployee(employee.id); }}>
                          <Trash2 size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <aside>
            <Card>
              <h2>Периоды отпуска</h2>
              <p className="muted">Выберите сотрудника в таблице и добавьте один или несколько периодов.</p>
              {selectedEmployee ? (
                <>
                  <div className="selected-person">
                    <span>Сотрудник</span>
                    <strong>{selectedEmployee.lastName}</strong>
                    <small>{selectedEmployee.department}</small>
                  </div>
                  <VacationEditor employee={selectedEmployee} onChange={replaceEmployee} adminUnlocked={adminUnlocked} />
                </>
              ) : (
                <div className="muted-box">Добавьте сотрудника, чтобы завести отпуск.</div>
              )}
            </Card>

            <Card>
              <h2>Справочники</h2>
              <p className="muted">Добавляйте отделы и страны, чтобы выбирать их у сотрудников.</p>
              <DirectoryEditor title="Отделы" items={departments} placeholder="Например, Маркетинг" onAdd={addDepartment} onRemove={removeDepartment} disabled={!adminUnlocked} />
              <DirectoryEditor title="Страны" items={countries} placeholder="Например, Казахстан" onAdd={addCountry} onRemove={removeCountry} disabled={!adminUnlocked} />
            </Card>
          </aside>
        </main>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
