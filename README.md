# Chatz - Modern Chat Application

A feature-rich chat application built with modern web technologies, offering real-time messaging, media sharing, and enhanced security features.

## Features

- Real-time messaging
- Voice messages with auto-transcription
- GIF and sticker support
- File attachments
- Message reactions
- Message editing and deletion
- Disappearing messages
- User blocking and reporting
- Offline support
- Dark mode
- Responsive design

## Tech Stack

- HTML5
- CSS3
- JavaScript (ES6+)
- Firebase
  - Authentication
  - Realtime Database
  - Firestore
  - Storage
- IndexedDB for offline support

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/chatz.git
cd chatz
```

2. Create a Firebase project and add your configuration:
- Go to [Firebase Console](https://console.firebase.google.com/)
- Create a new project
- Enable Authentication, Realtime Database, Firestore, and Storage
- Add your web app and copy the configuration
- Replace the Firebase config in `chat.html` with your configuration

3. Open `chat.html` in your browser or use a local server:
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve
```

## Security

- User authentication required
- Message encryption
- Content moderation
- User blocking system
- Report system
- Privacy settings

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Firebase for backend services
- Font Awesome for icons
- Google Fonts for typography