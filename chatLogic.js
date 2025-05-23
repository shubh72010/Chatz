import { authHelpers, firestoreHelpers, storageHelpers } from './firebaseHelpers.js';

// DOM elements
const sidebar = document.getElementById('sidebar');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const profileBtn = document.getElementById('profileBtn');
const groupInfoBtn = document.getElementById('groupInfoBtn');
const profileModal = document.getElementById('profileModal');
const groupInfoModal = document.getElementById('groupInfoModal');
const newGroupModal = document.getElementById('newGroupModal');
const closeProfileModal = document.getElementById('closeProfileModal');
const closeGroupInfoModal = document.getElementById('closeGroupInfoModal');
const closeNewGroupModal = document.getElementById('closeNewGroupModal');
const logoutBtn = document.getElementById('logoutBtn');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const leaveGroupBtn = document.getElementById('leaveGroupBtn');
const addMembersBtn = document.getElementById('addMembersBtn');
const cancelGroupBtn = document.getElementById('cancelGroupBtn');
const createGroupBtn = document.getElementById('createGroupBtn');
const sidebarTabs = document.querySelectorAll('.sidebar-tab');
const chatsTab = document.getElementById('chatsTab');
const friendsTab = document.getElementById('friendsTab');
const groupsTab = document.getElementById('groupsTab');
const newGroupBtn = document.getElementById('newGroupBtn');
const searchInput = document.getElementById('searchInput');

// Current chat state
let currentUser = null;
let currentChat = null;
let currentChatType = null; // 'dm' or 'group'
let friendsList = [];
let groupsList = [];
let chatsList = [];
let unsubscribeMessages = null;
let unsubscribeGroups = null;

// Initialize the app
async function init() {
    setupEventListeners();
    
    try {
        currentUser = await authHelpers.getCurrentUser();
        if (!currentUser) {
            // Redirect to login or show login modal
            console.log('User not logged in');
            return;
        }
        
        loadUserData();
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

// Set up event listeners
function setupEventListeners() {
    // Mobile menu toggle
    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

    // Sidebar tabs
    sidebarTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Chat input
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    sendMessageBtn.addEventListener('click', sendMessage);

    // Modals
    profileBtn.addEventListener('click', showProfileModal);
    groupInfoBtn.addEventListener('click', showGroupInfoModal);
    closeProfileModal.addEventListener('click', () => profileModal.style.display = 'none');
    closeGroupInfoModal.addEventListener('click', () => groupInfoModal.style.display = 'none');
    closeNewGroupModal.addEventListener('click', () => newGroupModal.style.display = 'none');
    
    // Modal buttons
    logoutBtn.addEventListener('click', logout);
    saveProfileBtn.addEventListener('click', saveProfile);
    leaveGroupBtn.addEventListener('click', leaveGroup);
    addMembersBtn.addEventListener('click', showAddMembers);
    cancelGroupBtn.addEventListener('click', () => newGroupModal.style.display = 'none');
    createGroupBtn.addEventListener('click', createGroup);
    
    // New group button
    newGroupBtn.addEventListener('click', showNewGroupModal);
    
    // Search input
    searchInput.addEventListener('input', handleSearch);
}

// Load user data
function loadUserData() {
    loadFriends();
    loadGroups();
    loadProfile();
}

// Load friends list
async function loadFriends() {
    try {
        const friendsSnapshot = await firestoreHelpers.getFriends(currentUser.uid);
        friendsList = [];
        friendsSnapshot.forEach(doc => {
            friendsList.push({ id: doc.id, ...doc.data() });
        });
        
        // For demo, we'll just use the friend IDs as is
        // In a real app, you'd fetch each friend's profile details
        renderFriendsList();
        updateChatsList();
    } catch (error) {
        console.error('Error loading friends:', error);
    }
}

// Load groups
function loadGroups() {
    // Set up real-time listener for groups
    unsubscribeGroups = firestoreHelpers.listenForUserGroups(currentUser.uid, (groups) => {
        groupsList = groups;
        renderGroupsList();
        updateChatsList();
    });
}

// Update combined chats list
function updateChatsList() {
    // Combine DMs and group chats with last message
    // In a real app, you'd have a proper chats collection with last messages
    chatsList = [
        ...friendsList.map(f => ({ 
            ...f, 
            type: 'dm', 
            name: f.displayName || `Friend ${f.id.substring(0, 5)}`,
            lastMessage: f.lastMessage || null 
        })), 
        ...groupsList.map(g => ({ 
            ...g, 
            type: 'group', 
            lastMessage: g.lastMessage || null 
        }))
    ];
    
    // Sort by last message timestamp (newest first)
    chatsList.sort((a, b) => {
        const aTime = a.lastMessage?.timestamp?.toMillis() || 0;
        const bTime = b.lastMessage?.timestamp?.toMillis() || 0;
        return bTime - aTime;
    });
    
    renderChatsList();
}

// Render friends list
function renderFriendsList() {
    friendsTab.innerHTML = '';
    
    friendsList.forEach(friend => {
        const friendItem = document.createElement('div');
        friendItem.className = 'list-item';
        friendItem.innerHTML = `
            <div class="list-item-avatar">
                <img src="${friend.photoURL || 'https://via.placeholder.com/40'}" alt="${friend.displayName || friend.id}">
            </div>
            <div class="list-item-text">
                <h4>${friend.displayName || `Friend ${friend.id.substring(0, 5)}`}</h4>
                <p>${friend.status || 'Offline'}</p>
            </div>
        `;
        friendItem.addEventListener('click', () => openChat(friend.id, 'dm'));
        friendsTab.appendChild(friendItem);
    });
}

// Render groups list
function renderGroupsList() {
    groupsTab.innerHTML = '';
    
    groupsList.forEach(group => {
        const groupItem = document.createElement('div');
        groupItem.className = 'list-item';
        groupItem.innerHTML = `
            <div class="list-item-avatar">
                <img src="${group.photoURL || 'https://via.placeholder.com/40'}" alt="${group.name}">
            </div>
            <div class="list-item-text">
                <h4>${group.name}</h4>
                <p>${group.members.length} members</p>
            </div>
        `;
        groupItem.addEventListener('click', () => openChat(group.id, 'group'));
        groupsTab.appendChild(groupItem);
    });
}

// Render chats list
function renderChatsList() {
    chatsTab.innerHTML = '';
    
    if (chatsList.length === 0) {
        chatsTab.innerHTML = '<p class="empty-state">No chats yet</p>';
        return;
    }
    
    chatsList.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = 'list-item';
        if (currentChat && ((chat.type === 'dm' && chat.id === currentChat) || (chat.type === 'group' && chat.id === currentChat))) {
            chatItem.classList.add('active');
        }
        
        const lastMessageText = chat.lastMessage?.text || 'No messages yet';
        const lastMessageTime = chat.lastMessage?.timestamp 
            ? formatTime(chat.lastMessage.timestamp.toDate()) 
            : '';
        
        chatItem.innerHTML = `
            <div class="list-item-avatar">
                <img src="${chat.photoURL || 'https://via.placeholder.com/40'}" alt="${chat.name}">
            </div>
            <div class="list-item-text">
                <h4>${chat.name}</h4>
                <p>${lastMessageText}</p>
            </div>
            ${lastMessageTime ? `<div class="message-time">${lastMessageTime}</div>` : ''}
            ${chat.unreadCount ? `<div class="list-item-badge">${chat.unreadCount}</div>` : ''}
        `;
        
        chatItem.addEventListener('click', () => openChat(chat.id, chat.type));
        chatsTab.appendChild(chatItem);
    });
}

// Format time for display
function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Switch between tabs
function switchTab(tabName) {
    sidebarTabs.forEach(tab => {
        if (tab.getAttribute('data-tab') === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    document.querySelectorAll('.sidebar-tab-content').forEach(content => {
        if (content.getAttribute('data-tab-content') === tabName) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

// Open a chat
function openChat(chatId, chatType) {
    // Unsubscribe from previous chat's messages
    if (unsubscribeMessages) {
        unsubscribeMessages();
    }
    
    currentChat = chatId;
    currentChatType = chatType;
    
    // Update UI
    document.querySelectorAll('.list-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Clear messages container
    messagesContainer.innerHTML = '';
    
    // Load chat messages
    loadMessages(chatId, chatType);
    
    // Update chat header
    updateChatHeader(chatId, chatType);
    
    // Mark messages as read if needed
    if (chatType === 'dm') {
        markMessagesAsRead(chatId);
    }
    
    // Re-render chats list to update active state
    renderChatsList();
}

// Load messages for a chat
function loadMessages(chatId, chatType) {
    const conversationId = chatType === 'dm' 
        ? [currentUser.uid, chatId].sort().join('_') 
        : chatId;
    
    unsubscribeMessages = firestoreHelpers.listenForMessages(conversationId, (messages) => {
        messagesContainer.innerHTML = '';
        
        if (messages.length === 0) {
            messagesContainer.innerHTML = '<div class="empty-state"><p>No messages yet</p></div>';
            return;
        }
        
        messages.forEach(message => {
            addMessageToUI(message, message.senderId === currentUser.uid);
        });
        
        // Scroll to bottom
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
    });
}

// Add message to UI
function addMessageToUI(message, isSent) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
    
    // Get sender info
    let senderName = 'Unknown';
    let senderAvatar = 'https://via.placeholder.com/32';
    
    if (isSent) {
        senderName = currentUser.displayName || 'You';
        senderAvatar = currentUser.photoURL || senderAvatar;
    } else if (currentChatType === 'dm') {
        const friend = friendsList.find(f => f.id === message.senderId);
        if (friend) {
            senderName = friend.displayName || `Friend ${friend.id.substring(0, 5)}`;
            senderAvatar = friend.photoURL || senderAvatar;
        }
    } else {
        // For groups, we'd need to fetch member info
        senderName = `User ${message.senderId.substring(0, 5)}`;
    }
    
    const timestamp = message.timestamp ? message.timestamp.toDate() : new Date();
    const timeString = formatTime(timestamp);
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <img src="${senderAvatar}" alt="${senderName}">
        </div>
        <div class="message-content">
            ${!isSent ? `<div class="message-sender">${senderName}</div>` : ''}
            <div class="message-text">${message.text}</div>
            <div class="message-time">${timeString}</div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
}

// Update chat header
function updateChatHeader(chatId, chatType) {
    const chatAvatar = document.getElementById('chatAvatar');
    const chatTitle = document.getElementById('chatTitle');
    const chatStatus = document.getElementById('chatStatus');
    
    if (chatType === 'dm') {
        const friend = friendsList.find(f => f.id === chatId);
        if (friend) {
            chatAvatar.src = friend.photoURL || 'https://via.placeholder.com/40';
            chatTitle.textContent = friend.displayName || `Friend ${friend.id.substring(0, 5)}`;
            chatStatus.textContent = friend.status || 'Offline';
        }
    } else {
        const group = groupsList.find(g => g.id === chatId);
        if (group) {
            chatAvatar.src = group.photoURL || 'https://via.placeholder.com/40';
            chatTitle.textContent = group.name;
            chatStatus.textContent = `${group.members.length} members`;
        }
    }
    
    // Show/hide group info button
    groupInfoBtn.style.display = chatType === 'group' ? 'block' : 'none';
}

// Send message
async function sendMessage() {
    const messageText = messageInput.value.trim();
    if (!messageText || !currentChat || !currentChatType) return;
    
    const message = {
        text: messageText,
        senderId: currentUser.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        const conversationId = currentChatType === 'dm' 
            ? [currentUser.uid, currentChat].sort().join('_') 
            : currentChat;
        
        await firestoreHelpers.sendMessage(conversationId, message);
        messageInput.value = '';
        
        // Update last message in chats list
        updateLastMessage(currentChat, currentChatType, messageText);
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

// Update last message in chats list
function updateLastMessage(chatId, chatType, messageText) {
    const chatIndex = chatsList.findIndex(chat => 
        (chatType === 'dm' && chat.id === chatId) || (chatType === 'group' && chat.id === chatId));
    
    if (chatIndex !== -1) {
        chatsList[chatIndex].lastMessage = {
            text: messageText,
            timestamp: new Date()
        };
        
        // Move to top of list
        const chat = chatsList.splice(chatIndex, 1)[0];
        chatsList.unshift(chat);
        
        renderChatsList();
    }
}

// Mark messages as read
function markMessagesAsRead(chatId) {
    // In a real app, we would update the read status in Firestore
    const chatIndex = chatsList.findIndex(chat => chat.id === chatId && chat.type === 'dm');
    
    if (chatIndex !== -1 && chatsList[chatIndex].unreadCount) {
        chatsList[chatIndex].unreadCount = 0;
        renderChatsList();
    }
}

// Show profile modal
function showProfileModal() {
    // Load current user data
    document.getElementById('profileAvatar').src = currentUser.photoURL || 'https://via.placeholder.com/100';
    document.getElementById('profileName').textContent = currentUser.displayName || 'Your Name';
    document.getElementById('profileUsername').textContent = currentUser.email ? `@${currentUser.email.split('@')[0]}` : '@username';
    document.getElementById('profileEmail').textContent = currentUser.email || 'user@example.com';
    
    profileModal.style.display = 'flex';
}

// Save profile
async function saveProfile() {
    const displayName = document.getElementById('profileName').textContent;
    
    try {
        await authHelpers.updateProfile(displayName, currentUser.photoURL);
        alert('Profile updated successfully!');
        profileModal.style.display = 'none';
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile');
    }
}

// Logout
async function logout() {
    try {
        await authHelpers.signOut();
        // Redirect to login page
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error logging out:', error);
    }
}

// Show group info modal
async function showGroupInfoModal() {
    if (!currentChat || currentChatType !== 'group') return;
    
    try {
        const group = groupsList.find(g => g.id === currentChat);
        if (!group) return;
        
        // Set group info
        document.getElementById('groupInfoAvatar').src = group.photoURL || 'https://via.placeholder.com/100';
        document.getElementById('groupInfoName').textContent = group.name;
        document.getElementById('groupInfoMembers').textContent = `${group.members.length} members`;
        document.getElementById('groupInfoCreated').textContent = group.createdAt 
            ? group.createdAt.toDate().toLocaleDateString() 
            : 'Unknown';
        
        // Check if current user is admin
        const isAdmin = group.admin === currentUser.uid;
        document.getElementById('groupInfoAdmin').textContent = isAdmin ? 'You' : 'Other admin';
        
        // Clear members list
        const membersList = document.getElementById('groupInfoMembersList');
        membersList.innerHTML = '';
        
        // Add members to list (in a real app, you'd fetch user details for each member)
        group.members.forEach(memberId => {
            const memberItem = document.createElement('div');
            memberItem.className = 'group-member';
            
            const isCurrentUser = memberId === currentUser.uid;
            const isAdmin = memberId === group.admin;
            
            memberItem.innerHTML = `
                <div class="group-member-avatar">
                    <img src="https://via.placeholder.com/30" alt="Member">
                </div>
                <div class="group-member-name">
                    ${isCurrentUser ? 'You' : `User ${memberId.substring(0, 5)}`}
                </div>
                <div class="group-member-status">
                    ${isAdmin ? 'Admin' : 'Member'}
                </div>
            `;
            
            membersList.appendChild(memberItem);
        });
        
        groupInfoModal.style.display = 'flex';
    } catch (error) {
        console.error('Error loading group info:', error);
    }
}

// Leave group
async function leaveGroup() {
    if (!currentChat || currentChatType !== 'group') return;
    
    if (confirm('Are you sure you want to leave this group?')) {
        try {
            await firestoreHelpers.leaveGroup(currentChat, currentUser.uid);
            groupInfoModal.style.display = 'none';
            currentChat = null;
            currentChatType = null;
            
            // The groups listener will automatically update the UI
        } catch (error) {
            console.error('Error leaving group:', error);
            alert('Failed to leave group');
        }
    }
}

// Show add members modal
function showAddMembers() {
    alert('Add members functionality would be implemented here');
}

// Show new group modal
function showNewGroupModal() {
    // Clear previous selection
    document.getElementById('groupName').value = '';
    const memberSelection = document.getElementById('groupMemberSelection');
    memberSelection.innerHTML = '';
    
    // Add friends to member selection
    friendsList.forEach(friend => {
        const memberItem = document.createElement('div');
        memberItem.className = 'group-member';
        memberItem.innerHTML = `
            <div class="group-member-avatar">
                <img src="${friend.photoURL || 'https://via.plac