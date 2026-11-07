let db = null;
let currentEditingId = null;

const taskForm = document.getElementById('task-form');
const taskTitleInput = document.getElementById('task-title');
const taskDescInput = document.getElementById('task-description');
const taskSubmitBtn = document.getElementById('task-submit');
const taskListContainer = document.getElementById('task-list');
const statusMessage = document.getElementById('status-message');

function showMessage(text, isError = false) {
    statusMessage.textContent = text;
    statusMessage.style.color = isError ? '#d9534f' : '#5cb85c';
    setTimeout(() => { statusMessage.textContent = ''; }, 4000);
}

// Initialize Supabase using config.json
async function initApp() {
    try {
        const response = await fetch('config.json');
        const config = await response.json();
        
        if (!config.supabaseUrl || !config.supabasePublishableKey) {
            throw new Error('Invalid config.json values.');
        }

        const { createClient } = supabase;
        db = createClient(config.supabaseUrl, config.supabasePublishableKey);
        
        fetchTasks();
    } catch (error) {
        showMessage('Failed to load configuration: ' + error.message, true);
    }
}

// 1. Fetch and Display All Tasks
async function fetchTasks() {
    taskListContainer.innerHTML = 'Loading tasks...';
    const { data: tasks, error } = await db
        .from('tasks')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        showMessage('Error fetching tasks: ' + error.message, true);
        taskListContainer.innerHTML = '';
        return;
    }

    renderTasks(tasks);
}

function renderTasks(tasks) {
    taskListContainer.innerHTML = '';
    if (!tasks || tasks.length === 0) {
        taskListContainer.innerHTML = '<p>No tasks found.</p>';
        return;
    }

    tasks.forEach(task => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'task-item';
        itemDiv.setAttribute('data-id', task.id);
        
        itemDiv.innerHTML = `
            <div>
                <strong class="task-title">${escapeHtml(task.title)}</strong>
                <p class="task-description">${escapeHtml(task.description || '')}</p>
                <span class="task-status">Status: ${task.completed ? 'Completed' : 'Pending'}</span>
            </div>
            <div>
                <button class="toggle-task" onclick="toggleTaskStatus(${task.id}, ${!task.completed})">
                    ${task.completed ? 'Mark Incomplete' : 'Mark Complete'}
                </button>
                <button class="edit-task" onclick="startEditTask(${task.id}, '${escapeQuote(task.title)}', '${escapeQuote(task.description || '')}')">Edit</button>
                <button class="delete-task" onclick="deleteTask(${task.id})">Delete</button>
            </div>
        `;
        taskListContainer.appendChild(itemDiv);
    });
}

// 2. Add or Update Task via Form Submit
taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = taskTitleInput.value.trim();
    const description = taskDescInput.value.trim();

    if (!title) return;

    if (currentEditingId === null) {
        // CREATE Task (POST)
        const { error } = await db
            .from('tasks')
            .insert([{ title, description, completed: false }]);

        if (error) {
            showMessage('Error creating task: ' + error.message, true);
        } else {
            showMessage('Task created successfully!');
            resetForm();
            fetchTasks();
        }
    } else {
        // UPDATE Task (PUT / PATCH)
        const { error } = await db
            .from('tasks')
            .update({ title, description })
            .eq('id', currentEditingId);

        if (error) {
            showMessage('Error updating task: ' + error.message, true);
        } else {
            showMessage('Task updated successfully!');
            resetForm();
            fetchTasks();
        }
    }
});

// 3. Toggle Complete / Incomplete
window.toggleTaskStatus = async function(id, newStatus) {
    const { error } = await db
        .from('tasks')
        .update({ completed: newStatus })
        .eq('id', id);

    if (error) {
        showMessage('Error updating status: ' + error.message, true);
    } else {
        fetchTasks();
    }
};

// 4. Edit Task Setup
window.startEditTask = function(id, title, description) {
    currentEditingId = id;
    taskTitleInput.value = title;
    taskDescInput.value = description;
    taskSubmitBtn.textContent = 'Update Task';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 5. Delete Task
window.deleteTask = async function(id) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    const { error } = await db
        .from('tasks')
        .delete()
        .eq('id', id);

    if (error) {
        showMessage('Error deleting task: ' + error.message, true);
    } else {
        showMessage('Task deleted successfully.');
        fetchTasks();
    }
};

function resetForm() {
    currentEditingId = null;
    taskForm.reset();
    taskSubmitBtn.textContent = 'Add Task';
}

function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function escapeQuote(str) {
    return str.replace(/'/g, "\\'");
}

initApp();