// Estado Atual da Aplicação (Inicia sempre no mês e ano atual)
const currentDate = new Date();
let currentYear = currentDate.getFullYear();
let currentMonth = currentDate.getMonth();

// Variável temporária para controle do modal de edição
let activeEdit = null; 

// Dados Salvos no LocalStorage
let financeData = JSON.parse(localStorage.getItem('financeData')) || {};
let recurringItems = JSON.parse(localStorage.getItem('recurringItems')) || { incomes: [], expenses: [] };

// Referências dos Elementos DOM
const prevMonthBtn = document.getElementById('prev-month-btn');
const nextMonthBtn = document.getElementById('next-month-btn');
const currentMonthDisplay = document.getElementById('current-month-display');

const incomeForm = document.getElementById('income-form');
const incomeTitleInput = document.getElementById('income-title');
const incomeAmountInput = document.getElementById('income-amount');
const incomeRecurringCheckbox = document.getElementById('income-recurring');
const incomeList = document.getElementById('income-list');

const expenseForm = document.getElementById('expense-form');
const expenseTitleInput = document.getElementById('expense-title');
const expenseAmountInput = document.getElementById('expense-amount');
const expenseTypeSelect = document.getElementById('expense-type-select');
const expenseRecurringCheckbox = document.getElementById('expense-recurring');
const expenseSymbolPrefix = document.getElementById('expense-symbol-prefix');
const expenseList = document.getElementById('expense-list');

const totalIncomeEl = document.getElementById('total-income');
const totalSelectedExpensesEl = document.getElementById('total-selected-expenses');
const remainingBalanceEl = document.getElementById('remaining-balance');
const cardBalance = document.getElementById('card-balance');

const budgetProgressFill = document.getElementById('budget-progress-fill');
const budgetPercentEl = document.getElementById('budget-percent');

// Elementos do Modal de Edição
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-form');
const editTitleInput = document.getElementById('edit-title');
const editAmountInput = document.getElementById('edit-amount');
const editTypeGroup = document.getElementById('edit-type-group');
const editTypeSelect = document.getElementById('edit-type-select');
const editRecurringCheckbox = document.getElementById('edit-recurring');
const editAmountLabel = document.getElementById('edit-amount-label');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');

// Alternador de Símbolo do Formulário (R$ / %)
expenseTypeSelect.addEventListener('change', () => {
  if (expenseTypeSelect.value === 'percent') {
    expenseSymbolPrefix.textContent = '%';
  } else {
    expenseSymbolPrefix.textContent = 'R$';
  }
});

// Toggle de Tema (Dark / Light)
const themeToggleBtn = document.getElementById('theme-toggle');
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

themeToggleBtn.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
});

// Gerar chave no formato "YYYY-MM"
function getMonthKey(year, month) {
  const formattedMonth = String(month + 1).padStart(2, '0');
  return `${year}-${formattedMonth}`;
}

// Retorna a chave do mês anterior
function getPreviousMonthKey(year, month) {
  let prevY = year;
  let prevM = month - 1;
  if (prevM < 0) {
    prevM = 11;
    prevY -= 1;
  }
  return getMonthKey(prevY, prevM);
}

// Sincroniza itens recorrentes cadastrados para o mês visualizado
function syncRecurringItems(year, month) {
  const key = getMonthKey(year, month);
  
  // 1. Sincronizar Entradas Recorrentes
  recurringItems.incomes.forEach(rec => {
    if (rec.startKey && key < rec.startKey) return;
    
    // Se o mês foi explicitamente excluído para esta recorrência, não injeta
    if (rec.excludedMonths && rec.excludedMonths.includes(key)) return;

    const exists = financeData[key].incomes.some(i => i.id === rec.id || i.recurringId === rec.id);
    if (!exists) {
      financeData[key].incomes.push({
        id: rec.id,
        recurringId: rec.id,
        title: rec.title,
        amount: rec.amount,
        isRecurring: true
      });
    }
  });

  // 2. Sincronizar Despesas Recorrentes
  recurringItems.expenses.forEach(rec => {
    if (rec.startKey && key < rec.startKey) return;

    if (rec.excludedMonths && rec.excludedMonths.includes(key)) return;

    const exists = financeData[key].expenses.some(e => e.id === rec.id || e.recurringId === rec.id);
    if (!exists) {
      financeData[key].expenses.push({
        id: rec.id,
        recurringId: rec.id,
        title: rec.title,
        amount: rec.amount,
        isPercent: rec.isPercent || false,
        selected: true,
        isRecurring: true,
        fromPreviousMonth: false
      });
    }
  });
}

// Inicializa dados do mês e sincroniza despesas pendentes do mês anterior + itens recorrentes
function initMonthData(year, month) {
  const key = getMonthKey(year, month);
  if (!financeData[key]) {
    financeData[key] = { incomes: [], expenses: [] };
  }

  // Sincronizar recorrentes
  syncRecurringItems(year, month);

  // Carregar despesas pendentes do mês anterior
  const prevKey = getPreviousMonthKey(year, month);
  if (financeData[prevKey] && Array.isArray(financeData[prevKey].expenses)) {
    const pendingExpenses = financeData[prevKey].expenses.filter(e => !e.selected);

    pendingExpenses.forEach(pending => {
      const alreadyCopied = financeData[key].expenses.some(e => e.originalId === pending.id || e.id === pending.id);
      if (!alreadyCopied) {
        financeData[key].expenses.push({
          id: Date.now() + Math.random(),
          originalId: pending.id,
          title: pending.title,
          amount: pending.amount,
          isPercent: pending.isPercent || false,
          selected: false,
          isRecurring: pending.isRecurring || false,
          fromPreviousMonth: true
        });
      }
    });
  }
}

function saveData() {
  localStorage.setItem('financeData', JSON.stringify(financeData));
  localStorage.setItem('recurringItems', JSON.stringify(recurringItems));
}

function formatCurrency(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Navegação entre Meses
prevMonthBtn.addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  updateUI();
});

nextMonthBtn.addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  updateUI();
});

// Adicionar Entradas
incomeForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const key = getMonthKey(currentYear, currentMonth);
  const title = incomeTitleInput.value.trim();
  const amount = parseFloat(incomeAmountInput.value);
  const isRecurring = incomeRecurringCheckbox.checked;

  if (title && amount > 0) {
    const id = Date.now();
    const newIncome = { id, title, amount, isRecurring };

    if (isRecurring) {
      recurringItems.incomes.push({ id, title, amount, startKey: key, excludedMonths: [] });
    }

    financeData[key].incomes.push(newIncome);
    saveData();
    updateUI();
    incomeForm.reset();
  }
});

// Adicionar Despesas (Fixo ou Percentual)
expenseForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const key = getMonthKey(currentYear, currentMonth);
  const title = expenseTitleInput.value.trim();
  const rawAmount = parseFloat(expenseAmountInput.value);
  const isPercent = expenseTypeSelect.value === 'percent';
  const isRecurring = expenseRecurringCheckbox.checked;

  if (title && rawAmount > 0) {
    const id = Date.now();
    
    if (isRecurring) {
      recurringItems.expenses.push({ id, title, amount: rawAmount, isPercent, startKey: key, excludedMonths: [] });
    }

    financeData[key].expenses.push({
      id,
      title,
      amount: rawAmount,
      isPercent: isPercent,
      selected: true,
      isRecurring: isRecurring,
      fromPreviousMonth: false
    });

    saveData();
    updateUI();
    expenseForm.reset();
    expenseTypeSelect.value = 'fixed';
    expenseSymbolPrefix.textContent = 'R$';
  }
});

// Alternar Checkbox de Despesa
function toggleExpense(id) {
  const key = getMonthKey(currentYear, currentMonth);
  financeData[key].expenses = financeData[key].expenses.map(item => {
    if (item.id === id) {
      return { ...item, selected: !item.selected };
    }
    return item;
  });
  saveData();
  updateUI();
}

// Modal de Edição
function openEditModal(type, id) {
  const key = getMonthKey(currentYear, currentMonth);
  const list = type === 'income' ? financeData[key].incomes : financeData[key].expenses;
  const item = list.find(i => i.id === id);
  if (!item) return;

  activeEdit = { type, id };
  editTitleInput.value = item.title;
  editAmountInput.value = item.amount;
  editRecurringCheckbox.checked = !!item.isRecurring;
  
  if (type === 'income') {
    editTypeGroup.style.display = 'none';
    editAmountLabel.textContent = 'Valor (R$)';
    document.getElementById('modal-title-header').textContent = 'Editar Entrada';
  } else {
    editTypeGroup.style.display = 'flex';
    editTypeSelect.value = item.isPercent ? 'percent' : 'fixed';
    editAmountLabel.textContent = item.isPercent ? 'Percentual (%)' : 'Valor (R$)';
    document.getElementById('modal-title-header').textContent = 'Editar Despesa';
  }
  
  editModal.classList.add('active');
}

editTypeSelect.addEventListener('change', () => {
  if (editTypeSelect.value === 'percent') {
    editAmountLabel.textContent = 'Percentual (%)';
  } else {
    editAmountLabel.textContent = 'Valor (R$)';
  }
});

function closeEditModal() {
  editModal.classList.remove('active');
  activeEdit = null;
}

modalCloseBtn.addEventListener('click', closeEditModal);
modalCancelBtn.addEventListener('click', closeEditModal);

editForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!activeEdit) return;

  const key = getMonthKey(currentYear, currentMonth);
  const title = editTitleInput.value.trim();
  const amount = parseFloat(editAmountInput.value);
  const isRecurring = editRecurringCheckbox.checked;

  if (title && amount > 0) {
    const isIncome = activeEdit.type === 'income';
    const list = isIncome ? financeData[key].incomes : financeData[key].expenses;
    const item = list.find(i => i.id === activeEdit.id);
    
    if (item) {
      item.title = title;
      item.amount = amount;
      item.isRecurring = isRecurring;
      
      if (!isIncome) {
        item.isPercent = (editTypeSelect.value === 'percent');
      }

      // Atualizar lista global de itens recorrentes
      const recId = item.recurringId || item.id;
      const recList = isIncome ? recurringItems.incomes : recurringItems.expenses;
      const recIndex = recList.findIndex(r => r.id === recId);

      if (isRecurring) {
        const existingStartKey = recIndex > -1 ? recList[recIndex].startKey : key;
        const existingExcluded = recIndex > -1 ? (recList[recIndex].excludedMonths || []) : [];
        const updatedRec = { 
          id: recId, 
          title, 
          amount, 
          startKey: existingStartKey || key,
          excludedMonths: existingExcluded,
          ...(isIncome ? {} : { isPercent: item.isPercent }) 
        };
        if (recIndex > -1) {
          recList[recIndex] = updatedRec;
        } else {
          recList.push(updatedRec);
        }
      } else if (recIndex > -1) {
        recList.splice(recIndex, 1);
      }

      saveData();
      updateUI();
    }
  }
  closeEditModal();
});

function editIncome(id) { openEditModal('income', id); }
function editExpense(id) { openEditModal('expense', id); }

// Remoção Segura de Itens
function deleteIncome(id) {
  const key = getMonthKey(currentYear, currentMonth);
  const item = financeData[key].incomes.find(i => i.id === id);

  // Se for um item recorrente, registramos a exclusão para este mês específico na regra global
  if (item && (item.isRecurring || item.recurringId)) {
    const recId = item.recurringId || item.id;
    const recItem = recurringItems.incomes.find(r => r.id === recId);
    if (recItem) {
      if (!recItem.excludedMonths) recItem.excludedMonths = [];
      if (!recItem.excludedMonths.includes(key)) {
        recItem.excludedMonths.push(key);
      }
    }
  }

  financeData[key].incomes = financeData[key].incomes.filter(i => i.id !== id);
  saveData();
  updateUI();
}

function deleteExpense(id) {
  const key = getMonthKey(currentYear, currentMonth);
  const item = financeData[key].expenses.find(e => e.id === id);

  // Se for um item recorrente, registramos a exclusão para este mês específico na regra global
  if (item && (item.isRecurring || item.recurringId)) {
    const recId = item.recurringId || item.id;
    const recItem = recurringItems.expenses.find(r => r.id === recId);
    if (recItem) {
      if (!recItem.excludedMonths) recItem.excludedMonths = [];
      if (!recItem.excludedMonths.includes(key)) {
        recItem.excludedMonths.push(key);
      }
    }
  }

  financeData[key].expenses = financeData[key].expenses.filter(e => e.id !== id);
  saveData();
  updateUI();
}

// Atualização Geral da Interface
function updateUI() {
  initMonthData(currentYear, currentMonth);
  const key = getMonthKey(currentYear, currentMonth);

  // Exibição do Mês Atual
  const monthName = new Date(currentYear, currentMonth).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  currentMonthDisplay.textContent = monthName;

  const currentData = financeData[key];

  // 1. Calcular Renda Total
  let totalIncome = 0;
  incomeList.innerHTML = '';

  currentData.incomes.forEach(item => {
    totalIncome += item.amount;
    const li = document.createElement('li');
    li.className = 'list-item';

    let badgeHtml = '';
    if (item.isRecurring) {
      badgeHtml = '<span class="badge badge-recurring">Recorrente</span>';
    }

    li.innerHTML = `
      <div class="item-info">
        <span>${item.title}</span>
        ${badgeHtml}
      </div>
      <div class="item-actions">
        <span class="item-amount" style="color: var(--success);">+ ${formatCurrency(item.amount)}</span>
        <button class="btn-icon" onclick="editIncome(${item.id})" title="Editar">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        </button>
        <button class="btn-icon btn-icon-delete" onclick="deleteIncome(${item.id})" title="Excluir">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;
    incomeList.appendChild(li);
  });

  // 2. Renderizar Despesas e Calcular Valores Percentuais
  expenseList.innerHTML = '';
  let totalSelectedExpenses = 0;

  currentData.expenses.forEach(item => {
    let calculatedAmount = item.amount;
    if (item.isPercent) {
      calculatedAmount = (totalIncome * item.amount) / 100;
    }

    if (item.selected) {
      totalSelectedExpenses += calculatedAmount;
    }

    const li = document.createElement('li');
    li.className = `list-item ${!item.selected ? 'expense-deferred' : ''}`;

    let badgeHtml = '';
    if (item.isPercent) {
      badgeHtml += `<span class="badge badge-percent">${item.amount}% da Renda</span>`;
    }
    if (item.isRecurring) {
      badgeHtml += '<span class="badge badge-recurring">Recorrente</span>';
    }
    if (item.fromPreviousMonth) {
      badgeHtml += '<span class="badge badge-carried">Mês Anterior</span>';
    } else if (!item.selected) {
      badgeHtml += '<span class="badge badge-deferred">Adiada</span>';
    }

    li.innerHTML = `
      <div class="item-info">
        <input type="checkbox" class="custom-checkbox" id="exp-${item.id}" ${item.selected ? 'checked' : ''} onchange="toggleExpense(${item.id})">
        <label for="exp-${item.id}">
          ${item.title}
          ${badgeHtml}
        </label>
      </div>
      <div class="item-actions">
        <span class="item-amount" style="color: var(--danger);">- ${formatCurrency(calculatedAmount)}</span>
        <button class="btn-icon" onclick="editExpense(${item.id})" title="Editar">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        </button>
        <button class="btn-icon btn-icon-delete" onclick="deleteExpense(${item.id})" title="Excluir">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;
    expenseList.appendChild(li);
  });

  // 3. Atualização dos Cards Resumo
  const remainingBalance = totalIncome - totalSelectedExpenses;

  totalIncomeEl.textContent = formatCurrency(totalIncome);
  totalSelectedExpensesEl.textContent = formatCurrency(totalSelectedExpenses);
  remainingBalanceEl.textContent = formatCurrency(remainingBalance);

  if (remainingBalance < 0) {
    cardBalance.classList.add('card-negative');
  } else {
    cardBalance.classList.remove('card-negative');
  }

  // 4. Barra de Progresso
  let percent = 0;
  if (totalIncome > 0) {
    percent = Math.round((totalSelectedExpenses / totalIncome) * 100);
  } else if (totalSelectedExpenses > 0) {
    percent = 100;
  }

  const cappedPercent = Math.min(percent, 100);
  budgetProgressFill.style.width = `${cappedPercent}%`;
  budgetPercentEl.textContent = `${percent}%`;

  if (percent > 100) {
    budgetProgressFill.classList.add('overbudget');
  } else {
    budgetProgressFill.classList.remove('overbudget');
  }
}

// Inicializar interface ao carregar
updateUI();