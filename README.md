📚 Book Finder App

A simple React + Tailwind CSS web application that helps users search books using the Open Library API.
This project is built for Alex (College Student) who needs a fast and easy way to search books by title, author, subject, or ISBN.

🚀 Features

🔍 Search books by title, author, subject, or keyword

🖼️ Displays book covers (if available)

📖 Shows details: Title, Author, First Published Year

⭐ Add books to Favorites (saved in local storage)

📂 Filter results by language, year, eBooks-only

↕️ Sort results by newest, oldest, or title (A–Z)

📱 Responsive design with Tailwind CSS

🛠️ Tech Stack

React (Vite) – UI framework

Tailwind CSS – Styling

Open Library API – Book data

Example API:

https://openlibrary.org/search.json?title=harry+potter

⚙️ Installation & Setup

If you want to run locally (instead of CodeSandbox):

# Clone repo
git clone https://github.com/your-username/book-finder.git
cd book-finder

# Install dependencies
npm install

# Start development server
npm run dev



📂 Project Structure
book-finder/
 ├── src/
 │    ├── App.jsx        # Main React component
 │    ├── main.jsx       # Entry point
 │    └── styles.css     # Tailwind styles
 ├── public/             # Static files
 ├── package.json        # Dependencies
 └── README.md           # Project documentation

📝 Notes

Favorites are stored in browser localStorage.

API data comes directly from Open Library (free, no auth needed).

Some books may not have covers or complete metadata.

🌐 Live Demo

👉 https://h46pjf.csb.app/
