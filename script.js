/**
 * CALCULADORA UNIVERSITARIA PRO
 * Arquitectura: JavaScript ES6 Modular (Vanilla JS)
 * Patrón: Singleton / State Manager con persistencia LocalStorage
 */

// ==========================================================================
// 1. ESTADO GLOBAL DE LA APLICACIÓN
// ==========================================================================
const AppState = {
  courses: [],
  history: [],
  settings: {
    minPassingGrade: 10.5,
    maxGrade: 20,
    theme: 'light'
  },
  currentEditingId: null,

  // Inicializar Estado desde LocalStorage
  init() {
    const savedCourses = localStorage.getItem('unicalc_courses');
    const savedSettings = localStorage.getItem('unicalc_settings');
    const savedHistory = localStorage.getItem('unicalc_history');

    if (savedCourses) this.courses = JSON.parse(savedCourses);
    if (savedSettings) this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
    if (savedHistory) this.history = JSON.parse(savedHistory);
  },

  // Guardar Estado (Abstraído para fácil migración a Firebase)
  save() {
    localStorage.setItem('unicalc_courses', JSON.stringify(this.courses));
    localStorage.setItem('unicalc_settings', JSON.stringify(this.settings));
    localStorage.setItem('unicalc_history', JSON.stringify(this.history));
  }
};

// ==========================================================================
// 2. MÓDULO DE CALCULOS Y LÓGICA DE NEGOCIO
// ==========================================================================
const Calculator = {
  // Calculo de Promedio Ponderado: Σ(Nota × Crédito) / Σ(Créditos)
  calculateWeighted(courses) {
    if (!courses || courses.length === 0) {
      return { average: 0, totalCredits: 0, totalWeighted: 0, count: 0 };
    }

    const totalCredits = courses.reduce((acc, c) => acc + c.credits, 0);
    const totalWeighted = courses.reduce((acc, c) => acc + (c.grade * c.credits), 0);
    const average = totalCredits > 0 ? (totalWeighted / totalCredits) : 0;

    return {
      average: parseFloat(average.toFixed(2)),
      totalCredits,
      totalWeighted: parseFloat(totalWeighted.toFixed(2)),
      count: courses.length
    };
  },

  // Calculo de Promedio Simple
  calculateSimple(courses) {
    if (!courses || courses.length === 0) return 0;
    const total = courses.reduce((acc, c) => acc + c.grade, 0);
    return parseFloat((total / courses.length).toFixed(2));
  },

  // Obtener destacado
  getHighlights(courses) {
    if (!courses || courses.length === 0) {
      return { maxGrade: '-', minGrade: '-', maxCredits: '-' };
    }

    const maxG = [...courses].sort((a, b) => b.grade - a.grade)[0];
    const minG = [...courses].sort((a, b) => a.grade - b.grade)[0];
    const maxC = [...courses].sort((a, b) => b.credits - a.credits)[0];

    return {
      maxGrade: `${maxG.name} (${maxG.grade})`,
      minGrade: `${minG.name} (${minG.grade})`,
      maxCredits: `${maxC.name} (${maxC.credits} cr)`
    };
  }
};

// ==========================================================================
// 3. MOTOR GRÁFICO CUSTOM (CANVAS HTML5 PURO - SIN LIBRERÍAS EXTERNAS)
// ==========================================================================
const ChartEngine = {
  // Dibujar Gráfico Circular (Pie Chart)
  drawPieChart(canvasId, approvedCount, failedCount) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const total = approvedCount + failedCount;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (total === 0) {
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(140, 140, 100, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    const approvedAngle = (approvedCount / total) * Math.PI * 2;

    // Aprobados (Verde)
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.moveTo(140, 140);
    ctx.arc(140, 140, 100, 0, approvedAngle);
    ctx.closePath();
    ctx.fill();

    // Desaprobados (Rojo)
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(140, 140);
    ctx.arc(140, 140, 100, approvedAngle, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  },

  // Dibujar Gráfico de Barras Simple
  drawBarChart(canvasId, courses) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (courses.length === 0) return;

    const padding = 30;
    const barWidth = Math.min(30, (canvas.width - padding * 2) / courses.length - 10);
    const maxHeight = canvas.height - padding * 2;

    courses.forEach((course, index) => {
      const barHeight = (course.grade / 20) * maxHeight;
      const x = padding + index * (barWidth + 10);
      const y = canvas.height - padding - barHeight;

      ctx.fillStyle = course.grade >= AppState.settings.minPassingGrade ? '#2563eb' : '#dc2626';
      ctx.fillRect(x, y, barWidth, barHeight);
    });
  }
};

// ==========================================================================
// 4. INTERFAZ DE USUARIO Y EVENTOS (UI CONTROLLER)
// ==========================================================================
const UI = {
  init() {
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    // Navegación Sidebar
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
        
        const targetBtn = e.currentTarget;
        targetBtn.classList.add('active');
        
        const viewId = targetBtn.getAttribute('data-view') + 'View';
        document.getElementById(viewId).classList.add('active');
        document.getElementById('currentViewTitle').innerText = targetBtn.innerText.trim();
      });
    });

    // Toggle Modo Oscuro / Claro
    document.getElementById('themeToggleBtn').addEventListener('click', () => {
      const newTheme = AppState.settings.theme === 'light' ? 'dark' : 'light';
      AppState.settings.theme = newTheme;
      AppState.save();
      this.applyTheme(newTheme);
    });

    // Modal Control
    const modal = document.getElementById('courseModal');
    document.getElementById('addCourseBtn').addEventListener('click', () => {
      AppState.currentEditingId = null;
      document.getElementById('modalTitle').innerText = 'Agregar Nuevo Curso';
      document.getElementById('courseForm').reset();
      modal.classList.add('active');
    });

    document.getElementById('closeModalBtn').addEventListener('click', () => modal.classList.remove('active'));
    document.getElementById('cancelModalBtn').addEventListener('click', () => modal.classList.remove('active'));

    // Formulario Agregar/Editar Curso
    document.getElementById('courseForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('courseName').value;
      const grade = parseFloat(document.getElementById('courseGrade').value);
      const credits = parseInt(document.getElementById('courseCredits').value);

      if (AppState.currentEditingId) {
        // Editar
        const course = AppState.courses.find(c => c.id === AppState.currentEditingId);
        course.name = name;
        course.grade = grade;
        course.credits = credits;
      } else {
        // Agregar
        AppState.courses.push({
          id: Date.now().toString(),
          name,
          grade,
          credits
        });
      }

      AppState.save();
      modal.classList.remove('active');
      this.render();
    });

    // Buscador
    document.getElementById('searchInput').addEventListener('input', () => this.renderTable());

    // Ordenamiento
    document.getElementById('sortSelect').addEventListener('change', () => this.renderTable());

    // Simulador de Nota Form
    document.getElementById('simulatorForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const current = parseFloat(document.getElementById('simCurrentGrade').value);
      const weight = parseFloat(document.getElementById('simCurrentWeight').value) / 100;
      const target = parseFloat(document.getElementById('simTargetGrade').value);

      const remainingWeight = 1 - weight;
      const needed = (target - (current * weight)) / remainingWeight;

      const resultBox = document.getElementById('simulatorResult');
      const resultText = document.getElementById('simResultText');
      resultBox.classList.remove('hidden');

      if (needed > 20) {
        resultText.innerText = `Necesitas un ${needed.toFixed(2)}. ¡Imposible aprobar la meta en escala 0-20!`;
      } else if (needed <= 0) {
        resultText.innerText = `Ya has alcanzado tu meta con tus notas actuales.`;
      } else {
        resultText.innerText = `Necesitas obtener como mínimo un ${needed.toFixed(2)} en el porcentaje restante (${(remainingWeight * 100).toFixed(0)}%).`;
      }
    });

    // Exportación
    document.getElementById('exportCsvBtn').addEventListener('click', () => this.exportToCSV());
    document.getElementById('printBtn').addEventListener('click', () => window.print());
  },

  applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    document.getElementById('themeText').innerText = theme === 'light' ? 'Modo Oscuro' : 'Modo Claro';
    document.getElementById('themeIcon').innerText = theme === 'light' ? '🌙' : '☀️';
  },

  render() {
    this.applyTheme(AppState.settings.theme);
    this.renderStats();
    this.renderTable();
    this.renderCharts();
  },

  renderStats() {
    const stats = Calculator.calculateWeighted(AppState.courses);
    
    const avgEl = document.getElementById('statAverage');
    const statusEl = document.getElementById('statStatus');
    
    avgEl.innerText = stats.average.toFixed(2);
    document.getElementById('statCredits').innerText = stats.totalCredits;
    document.getElementById('statTotalWeighted').innerText = stats.totalWeighted;
    document.getElementById('statCourseCount').innerText = stats.count;

    // Actualizar Promedio Simple View
    document.getElementById('simpleAverageVal').innerText = Calculator.calculateSimple(AppState.courses).toFixed(2);

    // Cambiar color de badge dinámicamente
    if (stats.count === 0) {
      statusEl.innerText = "Sin datos";
      statusEl.className = "stat-badge";
    } else if (stats.average >= AppState.settings.minPassingGrade) {
      statusEl.innerText = "Aprobado";
      statusEl.className = "stat-badge status-approved";
    } else {
      statusEl.innerText = "Desaprobado";
      statusEl.className = "stat-badge status-failed";
    }

    // Highlights
    const hl = Calculator.getHighlights(AppState.courses);
    document.getElementById('hlMaxGrade').innerText = hl.maxGrade;
    document.getElementById('hlMinGrade').innerText = hl.minGrade;
    document.getElementById('hlMaxCredits').innerText = hl.maxCredits;
  },

  renderTable() {
    const tbody = document.getElementById('coursesTableBody');
    tbody.innerHTML = '';

    const query = document.getElementById('searchInput').value.toLowerCase();
    const sort = document.getElementById('sortSelect').value;

    let filtered = AppState.courses.filter(c => c.name.toLowerCase().includes(query));

    // Aplicar ordenamiento
    if (sort === 'name-asc') filtered.sort((a,b) => a.name.localeCompare(b.name));
    if (sort === 'grade-desc') filtered.sort((a,b) => b.grade - a.grade);
    if (sort === 'grade-asc') filtered.sort((a,b) => a.grade - b.grade);
    if (sort === 'credits-desc') filtered.sort((a,b) => b.credits - a.credits);

    filtered.forEach(course => {
      const tr = document.createElement('tr');
      const weighted = (course.grade * course.credits).toFixed(2);

      tr.innerHTML = `
        <td><strong>${course.name}</strong></td>
        <td><span class="${course.grade >= AppState.settings.minPassingGrade ? 'status-approved' : 'status-failed'}" style="padding: 2px 6px; border-radius: 4px;">${course.grade.toFixed(2)}</span></td>
        <td>${course.credits}</td>
        <td>${weighted}</td>
        <td>
          <div class="table-actions">
            <button class="btn-outline" onclick="UI.editCourse('${course.id}')">✏️</button>
            <button class="btn-outline" onclick="UI.duplicateCourse('${course.id}')">📋</button>
            <button class="btn-danger" onclick="UI.deleteCourse('${course.id}')">🗑️</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  renderCharts() {
    const approved = AppState.courses.filter(c => c.grade >= AppState.settings.minPassingGrade).length;
    const failed = AppState.courses.length - approved;

    ChartEngine.drawPieChart('pieChartCanvas', approved, failed);
    ChartEngine.drawBarChart('barChartCanvas', AppState.courses);
  },

  // Acciones sobre ítems
  deleteCourse(id) {
    if (confirm('¿Deseas eliminar este curso?')) {
      AppState.courses = AppState.courses.filter(c => c.id !== id);
      AppState.save();
      this.render();
    }
  },

  editCourse(id) {
    const course = AppState.courses.find(c => c.id === id);
    if (!course) return;

    AppState.currentEditingId = id;
    document.getElementById('modalTitle').innerText = 'Editar Curso';
    document.getElementById('courseName').value = course.name;
    document.getElementById('courseGrade').value = course.grade;
    document.getElementById('courseCredits').value = course.credits;
    
    document.getElementById('courseModal').classList.add('active');
  },

  duplicateCourse(id) {
    const course = AppState.courses.find(c => c.id === id);
    if (!course) return;

    AppState.courses.push({
      ...course,
      id: Date.now().toString(),
      name: `${course.name} (Copia)`
    });
    AppState.save();
    this.render();
  },

  // Exportar a CSV
  exportToCSV() {
    if (AppState.courses.length === 0) return alert('No hay datos para exportar');
    
    let csvContent = "data:text/csv;charset=utf-8,Curso,Nota,Creditos,Ponderado\n";
    AppState.courses.forEach(c => {
      csvContent += `"${c.name}",${c.grade},${c.credits},${(c.grade * c.credits).toFixed(2)}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "mis_notas_unicalc.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// ==========================================================================
// 5. INICIALIZACIÓN APP
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  AppState.init();
  UI.init();
});