// Инициализация Supabase
const supabaseUrl = 'https://ukhhxqeynlgdppwfehye.supabase.co';
const supabaseKey = 'sb_publishable_PaCr5kr0f6OqTXDMfeCoiA_jWcRgnJa';

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Элементы DOM
const formContainer = document.getElementById('formContainer');
const medicineForm = document.getElementById('medicineForm');
const medicinesContainer = document.getElementById('medicinesContainer');
const loading = document.getElementById('loading');
const totalCount = document.getElementById('totalCount');
const expiredCount = document.getElementById('expiredCount');
const prescriptionCount = document.getElementById('prescriptionCount');

// Кнопки
const showAddFormBtn = document.getElementById('showAddFormBtn');
const cancelBtn = document.getElementById('cancelBtn');
const refreshBtn = document.getElementById('refreshBtn');
const showAllBtn = document.getElementById('showAllBtn');

// Состояние
let isEditing = false;

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    loadMedicines();
    
    // Обработчики событий
    showAddFormBtn.addEventListener('click', () => {
        showForm();
    });
    
    cancelBtn.addEventListener('click', () => {
        hideForm();
        resetForm();
    });
    
    refreshBtn.addEventListener('click', () => {
        loadMedicines();
    });
    
    showAllBtn.addEventListener('click', () => {
        loadMedicines();
    });
    
    medicineForm.addEventListener('submit', handleFormSubmit);
});

// Функции
async function loadMedicines() {
    showLoading();
    
    try {
        // Получаем все записи из таблицы 'medicines'
        const { data: medicines, error } = await supabase
            .from('medicines')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        displayMedicines(medicines || []);
        updateStats(medicines || []);
    } catch (error) {
        console.error('Ошибка при загрузке лекарств:', error);
        medicinesContainer.innerHTML = `
            <div class="error-message">
                Ошибка при загрузке данных: ${error.message}
            </div>
        `;
    }
    
    hideLoading();
}

function displayMedicines(medicines) {
    if (medicines.length === 0) {
        medicinesContainer.innerHTML = `
            <div class="empty-state">
                <p>Лекарств пока нет. Добавьте первое лекарство!</p>
            </div>
        `;
        return;
    }
    
    const today = new Date();
    
    const medicinesHTML = medicines.map(medicine => {
        const expiryDate = new Date(medicine.expiry_date);
        const isExpired = expiryDate < today;
        const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        let cardClass = 'medicine-card';
        if (isExpired) {
            cardClass += ' expired';
        } else if (daysUntilExpiry <= 30) {
            cardClass += ' expiring';
        }
        
        return `
            <div class="${cardClass}" data-id="${medicine.id}">
                <div class="medicine-header">
                    <div class="medicine-name">${medicine.name}</div>
                    <div class="medicine-category">${medicine.category}</div>
                </div>
                <div class="medicine-details">
                    <p><strong>Количество:</strong> ${medicine.quantity} шт.</p>
                    <p><strong>Срок годности:</strong> ${formatDate(medicine.expiry_date)}</p>
                    ${medicine.description ? `<p><strong>Описание:</strong> ${medicine.description}</p>` : ''}
                    ${medicine.prescription_required ? `<p><strong>⚠️ Требуется рецепт</strong></p>` : ''}
                </div>
                <div class="medicine-actions">
                    <button onclick="editMedicine(${medicine.id})" class="btn btn-warning">Изменить</button>
                    <button onclick="deleteMedicine(${medicine.id})" class="btn btn-danger">Удалить</button>
                </div>
            </div>
        `;
    }).join('');
    
    medicinesContainer.innerHTML = `
        <div class="medicine-grid">
            ${medicinesHTML}
        </div>
    `;
}

async function editMedicine(id) {
    showLoading();
    
    try {
        const { data: medicine, error } = await supabase
            .from('medicines')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        // Заполняем форму данными
        document.getElementById('itemId').value = medicine.id;
        document.getElementById('name').value = medicine.name;
        document.getElementById('category').value = medicine.category;
        document.getElementById('quantity').value = medicine.quantity;
        document.getElementById('expiry_date').value = formatDateForInput(medicine.expiry_date);
        document.getElementById('description').value = medicine.description || '';
        document.getElementById('prescription_required').checked = medicine.prescription_required || false;
        
        document.getElementById('formTitle').textContent = 'Редактировать лекарство';
        isEditing = true;
        showForm();
    } catch (error) {
        console.error('Ошибка при загрузке лекарства:', error);
        alert('Не удалось загрузить данные для редактирования');
    }
    
    hideLoading();
}

async function deleteMedicine(id) {
    if (!confirm('Вы уверены, что хотите удалить это лекарство?')) return;
    
    showLoading();
    
    try {
        const { error } = await supabase
            .from('medicines')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        loadMedicines();
        alert('Лекарство успешно удалено!');
    } catch (error) {
        console.error('Ошибка при удалении:', error);
        alert('Ошибка при удалении лекарства');
    }
    
    hideLoading();
}

async function handleFormSubmit(event) {
    event.preventDefault();
    
    const formData = {
        name: document.getElementById('name').value,
        category: document.getElementById('category').value,
        quantity: parseInt(document.getElementById('quantity').value),
        expiry_date: document.getElementById('expiry_date').value || null,
        description: document.getElementById('description').value || null,
        prescription_required: document.getElementById('prescription_required').checked
    };
    
    const itemId = document.getElementById('itemId').value;
    
    showLoading();
    
    try {
        if (isEditing && itemId) {
            // Редактирование существующей записи
            const { error } = await supabase
                .from('medicines')
                .update(formData)
                .eq('id', itemId);
            
            if (error) throw error;
            
            alert('Лекарство успешно обновлено!');
        } else {
            // Добавление новой записи
            const { error } = await supabase
                .from('medicines')
                .insert([formData]);
            
            if (error) throw error;
            
            alert('Лекарство успешно добавлено!');
        }
        
        resetForm();
        hideForm();
        loadMedicines();
    } catch (error) {
        console.error('Ошибка при сохранении:', error);
        alert('Ошибка при сохранении: ' + error.message);
    }
    
    hideLoading();
}

function updateStats(medicines) {
    totalCount.textContent = medicines.length;
    
    const today = new Date();
    const expired = medicines.filter(m => {
        return m.expiry_date && new Date(m.expiry_date) < today;
    }).length;
    expiredCount.textContent = expired;
    
    const prescription = medicines.filter(m => m.prescription_required).length;
    prescriptionCount.textContent = prescription;
}

function showForm() {
    formContainer.classList.remove('hidden');
}

function hideForm() {
    formContainer.classList.add('hidden');
}

function resetForm() {
    medicineForm.reset();
    document.getElementById('itemId').value = '';
    document.getElementById('formTitle').textContent = 'Добавить новое лекарство';
    isEditing = false;
}

function showLoading() {
    loading.classList.remove('hidden');
    medicinesContainer.classList.add('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
    medicinesContainer.classList.remove('hidden');
}

function formatDate(dateString) {
    if (!dateString) return 'Не указан';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
}

function formatDateForInput(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}
