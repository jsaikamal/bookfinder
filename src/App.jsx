/*
README - Book Finder (React single-file) - FIXED VERSION

Issue fixed:
- The original file in this canvas was wrapped in a top-level block comment which meant
  the module exported nothing when copied into a React app. That causes React to try to
  render an undefined component and produces the runtime error "Minified React error #130".

Other robustness fixes added:
- Safe localStorage parsing with validation (resets corrupt data).
- Sanitization of favorites before storing and before rendering (ensures strings for keys/titles).
- Use Boolean(...) for boolean props (disabled) to avoid passing objects into DOM props.
- Safer key handling for list items (String(...)).
- Helpful console warnings when localStorage data is invalid.

How to use:
1. Create a new React app (CodeSandbox, StackBlitz, or create-react-app).
2. Replace App.jsx / App.js with the code below (copy the file body only).
3. Run the app. No extra npm packages required.

Notes for submission:
- Level 1: include this ChatGPT conversation link (use ChatGPT Share feature).
- Level 2: deploy on CodeSandbox/StackBlitz and share live link.
- Level 3: push to GitHub with README and notes.
*/

// App.jsx - Single React component (safe and debugged)
import React, { useState, useEffect } from "react";

// Load favorites from localStorage with validation and sanitization
function loadFavoritesFromLocalStorage() {
  try {
    const raw = localStorage.getItem("book_favs");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn(
        "book_favs in localStorage is not an array. Resetting to empty array."
      );
      localStorage.removeItem("book_favs");
      return [];
    }
    // Normalize each entry to the expected shape
    return parsed.map((item, idx) => ({
      key:
        item && (typeof item.key === "string" || typeof item.key === "number")
          ? String(item.key)
          : `fav-${idx}-${Math.random().toString(36).slice(2)}`,
      title:
        item && typeof item.title === "string"
          ? item.title
          : String(item && item.title ? item.title : "Unknown Title"),
      author_name:
        item && typeof item.author_name === "string"
          ? item.author_name
          : Array.isArray(item && item.author_name)
          ? item.author_name.join(", ")
          : "Unknown",
      first_publish_year:
        item && (item.first_publish_year || item.first_publish_year === 0)
          ? item.first_publish_year
          : "N/A",
      cover_i:
        item &&
        (typeof item.cover_i === "number" || typeof item.cover_i === "string")
          ? item.cover_i
          : null,
    }));
  } catch (err) {
    console.warn(
      "Error parsing book_favs from localStorage, clearing corrupt value.",
      err
    );
    try {
      localStorage.removeItem("book_favs");
    } catch (e) {}
    return [];
  }
}

// Sanitize a book object (from API) before storing as favorite
function sanitizeBookForFavorite(book, fallbackId = "") {
  return {
    key:
      book && (typeof book.key === "string" || typeof book.key === "number")
        ? String(book.key)
        : fallbackId || `book-${Math.random().toString(36).slice(2)}`,
    title: book && book.title ? String(book.title) : "Untitled",
    author_name:
      book && book.author_name
        ? Array.isArray(book.author_name)
          ? book.author_name.join(", ")
          : String(book.author_name)
        : "Unknown",
    first_publish_year:
      book && (book.first_publish_year || book.first_publish_year === 0)
        ? book.first_publish_year
        : "N/A",
    cover_i:
      book &&
      (typeof book.cover_i === "number" || typeof book.cover_i === "string")
        ? book.cover_i
        : null,
  };
}

export default function App() {
  const [query, setQuery] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [numFound, setNumFound] = useState(0);
  const [favorites, setFavorites] = useState(() =>
    loadFavoritesFromLocalStorage()
  );

  // Persist favorites (already sanitized) to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("book_favs", JSON.stringify(favorites));
    } catch (err) {
      console.warn("Failed to save favorites to localStorage", err);
    }
  }, [favorites]);

  useEffect(() => {
    if (!query || query.trim() === "") {
      setResults([]);
      setNumFound(0);
      return;
    }

    const controller = new AbortController();
    async function fetchBooks() {
      try {
        setLoading(true);
        setError(null);
        const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(
          query
        )}&page=${page}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok)
          throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
        const data = await res.json();
        setNumFound(data.numFound || 0);

        const docs = (data.docs || []).map((d, idx) => {
          const key =
            d && d.key
              ? String(d.key)
              : d && d.edition_key && d.edition_key[0]
              ? String(d.edition_key[0])
              : `book-${page}-${idx}`;
          return {
            key,
            title: d && d.title ? d.title : "Untitled",
            author_name:
              d && d.author_name
                ? Array.isArray(d.author_name)
                  ? d.author_name.join(", ")
                  : String(d.author_name)
                : "Unknown",
            first_publish_year:
              d && (d.first_publish_year || d.first_publish_year === 0)
                ? d.first_publish_year
                : "N/A",
            cover_i: d && (d.cover_i || d.cover_i === 0) ? d.cover_i : null,
          };
        });
        setResults(docs);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Unknown error");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchBooks();
    return () => controller.abort();
  }, [query, page]);

  function addFavorite(book) {
    const sanitized = sanitizeBookForFavorite(book);
    setFavorites((prev) => {
      if (prev.find((b) => b.key === sanitized.key)) return prev;
      const next = [sanitized, ...prev].slice(0, 50);
      return next;
    });
  }

  function removeFavorite(key) {
    setFavorites((prev) => prev.filter((b) => b.key !== key));
  }

  // derived filtered results by author text (safe string handling)
  const displayed = results.filter((r) =>
    (r.author_name || "")
      .toLowerCase()
      .includes((authorFilter || "").toLowerCase())
  );

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={{ margin: 0 }}>📚 Book Finder</h1>
        <p style={{ margin: "6px 0 0 0", opacity: 0.9 }}>
          Search books quickly using Open Library
        </p>
      </header>

      <main style={styles.container}>
        <section style={styles.searchBox}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              placeholder="Search by title (e.g., Dune, Introduction to Algorithms)"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              style={styles.input}
            />
            <button
              onClick={() => {
                setPage(1);
              }}
              style={styles.button}
            >
              Search
            </button>
          </div>
          <div
            style={{
              marginTop: 8,
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <input
              placeholder="Filter by author"
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value)}
              style={{ ...styles.input, flex: 1 }}
            />
            <div style={{ fontSize: 14, color: "#555" }}>
              {numFound} results
            </div>
          </div>
        </section>

        <section style={styles.resultsArea}>
          <div style={styles.resultsHeader}>
            <div style={{ fontWeight: 600 }}>
              {query ? `Results for "${query}"` : "No query yet"}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={styles.iconButton}
                disabled={page === 1}
              >
                Prev
              </button>
              <div>Page {page}</div>
              <button
                onClick={() => setPage((p) => p + 1)}
                style={styles.iconButton}
              >
                Next
              </button>
            </div>
          </div>

          {loading && <div style={styles.message}>Loading...</div>}
          {error && (
            <div style={{ ...styles.message, color: "red" }}>
              Error: {error}
            </div>
          )}

          {!loading && !error && (
            <div style={styles.grid}>
              {displayed.length === 0 && (
                <div style={styles.message}>No results to show</div>
              )}
              {displayed.map((book) => (
                <article key={String(book.key)} style={styles.card}>
                  <div style={styles.coverWrap}>
                    {book.cover_i ? (
                      <img
                        alt={String(book.title)}
                        src={`https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`}
                        style={styles.cover}
                      />
                    ) : (
                      <div style={styles.noCover}>No Cover</div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: "0 0 6px 0" }}>
                      {String(book.title)}
                    </h3>
                    <div style={{ fontSize: 13, color: "#333" }}>
                      {String(book.author_name)}
                    </div>
                    <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
                      First published: {String(book.first_publish_year)}
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                      <button
                        style={styles.smallButton}
                        onClick={() => addFavorite(book)}
                        disabled={Boolean(
                          favorites.find((f) => f.key === String(book.key))
                        )}
                      >
                        {favorites.find((f) => f.key === String(book.key))
                          ? "Saved"
                          : "Save"}
                      </button>
                      <a
                        href={`https://openlibrary.org${
                          String(book.key).startsWith("/")
                            ? String(book.key)
                            : `/${String(book.key)}`
                        }`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          ...styles.smallButton,
                          textDecoration: "none",
                        }}
                      >
                        Open
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside style={styles.sidebar}>
          <h3 style={{ marginTop: 0 }}>❤️ Favorites</h3>
          {favorites.length === 0 && (
            <div style={styles.messageSmall}>No favorites yet</div>
          )}
          <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
            {favorites.map((f) => (
              <li key={String(f.key)} style={styles.favItem}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {String(f.title)}
                  </div>
                  <div style={{ fontSize: 12 }}>{String(f.author_name)}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    style={styles.tinyBtn}
                    onClick={() =>
                      window.open(
                        `https://openlibrary.org${
                          String(f.key).startsWith("/")
                            ? String(f.key)
                            : `/${String(f.key)}`
                        }`,
                        "_blank"
                      )
                    }
                  >
                    Open
                  </button>
                  <button
                    style={styles.tinyBtn}
                    onClick={() => removeFavorite(String(f.key))}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div style={{ marginTop: 12 }}>
            <button
              style={styles.button}
              onClick={() => {
                setFavorites([]);
                try {
                  localStorage.removeItem("book_favs");
                } catch (e) {}
              }}
            >
              Clear All
            </button>
          </div>
        </aside>
      </main>

      <footer style={styles.footer}>
        <div>Built for Alex • Uses Open Library API</div>
        <div style={{ opacity: 0.8 }}>
          Tip: Try searching "harry potter" or "introduction to algorithms"
        </div>
      </footer>
    </div>
  );
}

// Basic inline styles to keep single-file runnable without extra CSS
const styles = {
  page: {
    fontFamily: "Inter, Roboto, Arial, sans-serif",
    padding: 12,
    maxWidth: 1100,
    margin: "0 auto",
  },
  header: { padding: "12px 0 6px 0" },
  container: {
    display: "grid",
    gridTemplateColumns: "1fr 300px",
    gap: 16,
    alignItems: "start",
  },
  searchBox: {
    gridColumn: "1 / span 1",
    padding: 12,
    background: "#fafafa",
    borderRadius: 8,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  input: {
    padding: "10px 12px",
    borderRadius: 6,
    border: "1px solid #ddd",
    width: 420,
    maxWidth: "100%",
  },
  button: {
    padding: "10px 14px",
    borderRadius: 6,
    border: "none",
    background: "#0b5cff",
    color: "white",
    cursor: "pointer",
  },
  resultsArea: { gridColumn: "1 / span 1", paddingTop: 8 },
  resultsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 12,
  },
  card: {
    display: "flex",
    gap: 10,
    padding: 12,
    borderRadius: 8,
    border: "1px solid #eee",
    background: "white",
    alignItems: "center",
  },
  coverWrap: {
    width: 80,
    height: 110,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cover: {
    maxWidth: "100%",
    maxHeight: "100%",
    borderRadius: 6,
    objectFit: "cover",
  },
  noCover: {
    width: 80,
    height: 110,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f0f0f0",
    borderRadius: 6,
    color: "#777",
    fontSize: 12,
  },
  smallButton: {
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid #ddd",
    background: "white",
    cursor: "pointer",
  },
  iconButton: {
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid #ccc",
    background: "white",
    cursor: "pointer",
  },
  sidebar: {
    padding: 12,
    borderRadius: 8,
    background: "#fff",
    border: "1px solid #f0f0f0",
  },
  favItem: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px dashed #f0f0f0",
  },
  tinyBtn: {
    padding: "6px 8px",
    borderRadius: 6,
    border: "1px solid #ddd",
    background: "white",
    cursor: "pointer",
    fontSize: 12,
  },
  message: { padding: 12, color: "#555" },
  messageSmall: { padding: 8, color: "#666" },
  footer: {
    marginTop: 18,
    padding: 10,
    display: "flex",
    justifyContent: "space-between",
    color: "#444",
    fontSize: 13,
  },
};
