document.addEventListener('DOMContentLoaded', () => {
    const storageKey = 'readingLogApp';
    const defaultCover = 'https://via.placeholder.com/150x220.png?text=No+Cover';

    const headerTitle = document.getElementById('header-title');
    const searchButton = document.getElementById('search-button');
    const screens = document.querySelectorAll('.screen');
    const bookListContainer = document.getElementById('book-list');
    const bookshelfEmptyNotice = document.getElementById('bookshelf-empty');
    const bookDetailScreen = document.getElementById('book-detail-screen');
    const memoFormScreen = document.getElementById('memo-form-screen');
    const memoFormTitle = document.getElementById('memo-form-title');
    const memoForm = document.getElementById('memo-form');
    const memoTextInput = document.getElementById('memo-text');
    const memoQuoteInput = document.getElementById('memo-quote');
    const memoTagInput = document.getElementById('memo-tags');
    const memoTagSuggestions = document.getElementById('memo-tag-suggestions');
    const attachPhotoButton = document.getElementById('attach-photo-button');
    const photoInput = document.getElementById('photo-input');
    const memoPhotoPreview = document.getElementById('memo-photo-preview');
    const memoCancelButton = document.getElementById('memo-cancel-button');

    const searchScreen = document.getElementById('search-screen');
    const searchInput = document.getElementById('search-input');
    const clearSearchButton = document.getElementById('clear-search-button');
    const searchResultsContainer = document.getElementById('search-results');
    const searchTagFilter = document.getElementById('search-tag-filter');

    const navBookshelf = document.getElementById('nav-bookshelf');
    const navSearch = document.getElementById('nav-search');
    const addBookButton = document.getElementById('add-book-button');

    const bookModal = document.getElementById('book-modal');
    const bookModalBackdrop = document.getElementById('book-modal-backdrop');
    const bookModalClose = document.getElementById('book-modal-close');
    const bookForm = document.getElementById('book-form');
    const bookFormCancel = document.getElementById('book-form-cancel');
    const bookTitleInput = document.getElementById('book-title-input');
    const bookAuthorInput = document.getElementById('book-author-input');
    const bookIsbnInput = document.getElementById('book-isbn-input');
    const bookCoverUrlInput = document.getElementById('book-cover-url-input');
    const bookCoverInput = document.getElementById('book-cover-input');
    const bookCoverPreview = document.getElementById('book-cover-preview');
    const bookSearchButton = document.getElementById('book-search-button');
    const bookSearchResults = document.getElementById('book-search-results');
    const bookScanButton = document.getElementById('book-scan-button');
    const scanModal = document.getElementById('scan-modal');
    const scanModalBackdrop = document.getElementById('scan-modal-backdrop');
    const scanModalClose = document.getElementById('scan-modal-close');
    const scanVideo = document.getElementById('scan-video');
    const scanStatus = document.getElementById('scan-status');
    const scanRetryButton = document.getElementById('scan-retry-button');
    const scanCancelButton = document.getElementById('scan-cancel-button');

    let appData = { books: {} };
    let currentBookId = null;
    let activeBookTagFilter = null;
    let bookCoverDraft = null;
    let barcodeModule = null;
    let barcodeReader = null;
    let scanControls = null;
    let isProcessingScan = false;
    let useBarcodeDetectorAPI = false;
    const bookSearchState = { results: [], isLoading: false };

    let barcodeDetector = null;

    const memoFormState = {
        editingBookId: null,
        editingMemoId: null,
        photos: []
    };

    const searchState = {
        tags: new Set()
    };

    function generateId(prefix) {
        const random = Math.random().toString(36).slice(2, 8);
        return `${prefix}-${Date.now().toString(36)}-${random}`;
    }

    function escapeHtml(value) {
        if (typeof value !== 'string') {
            return '';
        }
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function toDisplayText(value) {
        if (!value) {
            return '';
        }
        return escapeHtml(value).replace(/\r?\n/g, '<br>');
    }

    function formatDateTime(timestamp) {
        if (!timestamp) {
            return '';
        }
        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime())) {
            return '';
        }
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
    }

    function normalizePhoto(photo) {
        if (!photo || typeof photo !== 'object' || !photo.dataUrl) {
            return null;
        }
        return {
            id: photo.id || generateId('photo'),
            name: photo.name || 'photo',
            dataUrl: photo.dataUrl
        };
    }

    function normalizeMemo(memo) {
        if (!memo || typeof memo !== 'object') {
            return null;
        }
        const legacyContent = typeof memo.content === 'string' ? memo.content : '';
        const legacyType = memo.type;
        const normalizedPhotos = Array.isArray(memo.photos)
            ? memo.photos.map(normalizePhoto).filter(Boolean)
            : [];

        const tags = Array.isArray(memo.tags)
            ? memo.tags
                .map(tag => (typeof tag === 'string' ? tag.trim() : ''))
                .filter(Boolean)
            : [];

        const base = {
            id: memo.id || generateId('memo'),
            text: typeof memo.text === 'string' ? memo.text : '',
            quote: typeof memo.quote === 'string' ? memo.quote : '',
            photos: normalizedPhotos,
            tags,
            createdAt: memo.createdAt || Date.now(),
            updatedAt: memo.updatedAt || Date.now()
        };

        if (legacyType === 'text' && legacyContent && !base.text) {
            base.text = legacyContent;
        } else if (legacyType === 'quote' && legacyContent && !base.quote) {
            base.quote = legacyContent;
        } else if (!legacyType && legacyContent && !base.text && !base.quote) {
            base.text = legacyContent;
        }

        return base;
    }

    function createSeedData() {
        const bookId = generateId('book');
        const now = Date.now();
        return {
            books: {
                [bookId]: {
                    id: bookId,
                    title: 'ビジネス思考法入門',
                    author: '山田 太郎',
                    isbn: '9784123456789',
                    cover: 'https://via.placeholder.com/150x220.png?text=Sample+Book',
                    createdAt: now,
                    memos: [
                        {
                            id: generateId('memo'),
                            text: 'ビジネス課題は「顧客価値」「提供価値」「組織能力」の3層で整理すると抜け漏れが減る。',
                            quote: '「仮説は問いから始め、検証で磨き上げる」',
                            photos: [],
                            tags: ['ビジネス', '戦略'],
                            createdAt: now,
                            updatedAt: now
                        },
                        {
                            id: generateId('memo'),
                            text: '第3章の図表をもとに、自社案件へ適用したいポイントを整理する。',
                            quote: '',
                            photos: [],
                            tags: ['アクションプラン'],
                            createdAt: now,
                            updatedAt: now
                        }
                    ]
                }
            }
        };
    }

    function normalizeData(raw) {
        if (!raw || typeof raw !== 'object' || !raw.books) {
            return createSeedData();
        }

        const normalizedBooks = {};
        Object.entries(raw.books).forEach(([bookId, book]) => {
            if (!book || typeof book !== 'object') {
                return;
            }
            const normalizedId = bookId || generateId('book');
            const memos = Array.isArray(book.memos)
                ? book.memos.map(normalizeMemo).filter(Boolean)
                : [];
            normalizedBooks[normalizedId] = {
                id: normalizedId,
                title: typeof book.title === 'string' && book.title.trim() ? book.title.trim() : 'タイトル未設定',
                author: typeof book.author === 'string' && book.author.trim() ? book.author.trim() : '著者未設定',
                isbn: typeof book.isbn === 'string' ? book.isbn.trim() : '',
                cover: typeof book.cover === 'string' && book.cover.trim() ? book.cover : defaultCover,
                createdAt: book.createdAt || Date.now(),
                memos
            };
        });

        if (Object.keys(normalizedBooks).length === 0) {
            return createSeedData();
        }

        return { books: normalizedBooks };
    }

    function saveData() {
        try {
            localStorage.setItem(storageKey, JSON.stringify(appData));
        } catch (error) {
            console.error('ローカルストレージへの保存に失敗しました', error);
        }
    }

    function loadData() {
        try {
            const raw = localStorage.getItem(storageKey);
            if (!raw) {
                appData = createSeedData();
                saveData();
                return;
            }
            const parsed = JSON.parse(raw);
            appData = normalizeData(parsed);
        } catch (error) {
            console.error('保存データの読み込みに失敗したため初期データを使用します', error);
            appData = createSeedData();
            saveData();
        }
    }

    function getAllTags() {
        const tagSet = new Set();
        Object.values(appData.books).forEach(book => {
            book.memos.forEach(memo => {
                memo.tags.forEach(tag => tagSet.add(tag));
            });
        });
        return Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'ja'));
    }

    function getBookTagList(book) {
        const tagSet = new Set();
        book.memos.forEach(memo => {
            memo.tags.forEach(tag => tagSet.add(tag));
        });
        return Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'ja'));
    }

    function updateTagSuggestions() {
        if (!memoTagSuggestions) {
            return;
        }
        const tags = getAllTags();
        if (!tags.length) {
            memoTagSuggestions.innerHTML = '<p class="placeholder">タグを登録するとここに表示されます。</p>';
            return;
        }
        memoTagSuggestions.innerHTML = tags.map(tag => {
            const safeTag = escapeHtml(tag);
            return `<button type="button" class="tag-chip" data-action="append-tag" data-tag="${safeTag}">#${safeTag}</button>`;
        }).join('');
    }

    function updateSearchTagFilter() {
        if (!searchTagFilter) {
            return;
        }
        const tags = getAllTags();
        if (!tags.length) {
            searchTagFilter.innerHTML = '<p class="placeholder">まだタグがありません。</p>';
            return;
        }
        searchTagFilter.innerHTML = tags.map(tag => {
            const safeTag = escapeHtml(tag);
            const selected = searchState.tags.has(tag);
            return `<button type="button" class="tag-chip ${selected ? 'selected' : ''}" data-action="toggle-search-tag" data-tag="${safeTag}" aria-pressed="${selected}">#${safeTag}</button>`;
        }).join('');
    }

    function renderBookshelf() {
        if (!bookListContainer) {
            return;
        }
        const books = Object.values(appData.books)
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        if (!books.length) {
            bookListContainer.innerHTML = '';
            renderBookshelfEmptyState();
            return;
        }

        bookListContainer.innerHTML = books.map(book => {
            const memoCount = book.memos.length;
            const tagList = getBookTagList(book).slice(0, 3);
            const tagsHtml = tagList.length
                ? `<div class="card-tags">${tagList.map(tag => `<span class="tag-chip static">#${escapeHtml(tag)}</span>`).join('')}</div>`
                : '';
            return `
                <article class="book-item" data-book-id="${book.id}">
                    <div class="book-cover">
                        <img src="${escapeHtml(book.cover || defaultCover)}" alt="${escapeHtml(book.title)}の表紙">
                    </div>
                    <div class="book-info">
                        <h2>${escapeHtml(book.title)}</h2>
                        <p class="book-author">${escapeHtml(book.author)}</p>
                        ${book.isbn ? `<p class="book-isbn">ISBN: ${escapeHtml(book.isbn)}</p>` : ''}
                        <p class="book-memo-count">${memoCount}件のメモ</p>
                        ${tagsHtml}
                    </div>
                </article>
            `;
        }).join('');
        renderBookshelfEmptyState();
    }

    function renderBookshelfEmptyState() {
        if (!bookshelfEmptyNotice) {
            return;
        }
        bookshelfEmptyNotice.hidden = Object.keys(appData.books).length > 0;
    }

    function buildMemoBodyHTML(memo, options = {}) {
        const blocks = [];
        if (memo.text) {
            blocks.push(`<p class="memo-text">${toDisplayText(memo.text)}</p>`);
        }
        if (memo.quote) {
            blocks.push(`<blockquote class="memo-quote"><p>${toDisplayText(memo.quote)}</p></blockquote>`);
        }
        if (memo.photos && memo.photos.length) {
            const photosHtml = memo.photos.map(photo => {
                const safeName = escapeHtml(photo.name);
                return `<figure class="memo-photo"><img src="${escapeHtml(photo.dataUrl)}" alt="${safeName}"></figure>`;
            }).join('');
            blocks.push(`<div class="memo-photos">${photosHtml}</div>`);
        }
        if (memo.tags && memo.tags.length) {
            const tagAction = options.tagAction === 'search' ? 'apply-search-tag' : 'apply-book-tag';
            const tagsHtml = memo.tags.map(tag => {
                const safeTag = escapeHtml(tag);
                return `<button type="button" class="tag-chip" data-action="${tagAction}" data-tag="${safeTag}">#${safeTag}</button>`;
            }).join('');
            blocks.push(`<div class="memo-tags">${tagsHtml}</div>`);
        }
        blocks.push(`<p class="memo-meta">更新: ${formatDateTime(memo.updatedAt)}</p>`);
        return blocks.join('\n');
    }

    function createMemoItemHTML(memo, bookId, options = {}) {
        const includeActions = options.includeActions !== false;
        const body = buildMemoBodyHTML(memo, options);
        const actionsHtml = includeActions
            ? `
                <div class="memo-item-actions">
                    <button type="button" class="icon-button" data-action="edit-memo" data-book-id="${bookId}" data-memo-id="${memo.id}" aria-label="メモを編集">✏️</button>
                    <button type="button" class="icon-button" data-action="delete-memo" data-book-id="${bookId}" data-memo-id="${memo.id}" aria-label="メモを削除">🗑️</button>
                </div>
            `
            : '';
        return `
            <div class="memo-item" data-book-id="${bookId}" data-memo-id="${memo.id}">
                ${actionsHtml}
                ${body}
            </div>
        `;
    }

    function renderBookDetail({ tag } = {}) {
        const book = currentBookId ? appData.books[currentBookId] : null;
        if (!book) {
            bookDetailScreen.innerHTML = '<p class="placeholder">書籍が選択されていません。</p>';
            return;
        }

        if (typeof tag !== 'undefined') {
            activeBookTagFilter = tag || null;
        }

        const tagList = getBookTagList(book);
        const filteredMemos = book.memos
            .filter(memo => {
                if (!activeBookTagFilter) {
                    return true;
                }
                return memo.tags.includes(activeBookTagFilter);
            })
            .sort((a, b) => b.updatedAt - a.updatedAt);

        const memosHtml = filteredMemos.length
            ? filteredMemos.map(memo => createMemoItemHTML(memo, book.id, { tagAction: 'book' })).join('')
            : `<p class="placeholder">${activeBookTagFilter ? '選択したタグのメモはありません。' : 'まだメモがありません。'}</p>`;

        const tagFilterHtml = tagList.length
            ? `
                <div class="tag-filter">
                    <button type="button" class="tag-chip ${!activeBookTagFilter ? 'selected' : ''}" data-action="filter-book-tag" data-tag="">すべて</button>
                    ${tagList.map(tagItem => {
                        const safeTag = escapeHtml(tagItem);
                        const selected = activeBookTagFilter === tagItem;
                        return `<button type="button" class="tag-chip ${selected ? 'selected' : ''}" data-action="filter-book-tag" data-tag="${safeTag}">#${safeTag}</button>`;
                    }).join('')}
                </div>
            `
            : '<p class="placeholder">タグはまだありません。</p>';

        bookDetailScreen.innerHTML = `
            <button type="button" class="back-button" data-action="back-to-bookshelf">← 本棚に戻る</button>
            <div class="book-detail-header">
                <img src="${escapeHtml(book.cover || defaultCover)}" alt="${escapeHtml(book.title)}の表紙" class="book-detail-cover">
                <div class="book-detail-meta">
                    <div class="book-detail-meta-header">
                        <h2>${escapeHtml(book.title)}</h2>
                        <button type="button" class="icon-button danger" data-action="delete-book" data-book-id="${book.id}" aria-label="書籍を削除">🗑️</button>
                    </div>
                    <p class="book-detail-author">${escapeHtml(book.author)}</p>
                    ${book.isbn ? `<p class="book-detail-isbn">ISBN: ${escapeHtml(book.isbn)}</p>` : ''}
                </div>
            </div>
            <section class="memo-section">
                <div class="memo-section-header">
                    <h3>メモ一覧</h3>
                    ${tagFilterHtml}
                </div>
                <div class="memo-list">
                    ${memosHtml}
                </div>
            </section>
            <button id="add-memo-fab" class="fab" type="button" aria-label="メモを追加">+</button>
        `;
        const addMemoFab = document.getElementById('add-memo-fab');
        if (addMemoFab) {
            addMemoFab.addEventListener('click', () => {
                openMemoForm(book.id);
            });
        }
    }

    function showScreen(screenId) {
        screens.forEach(screen => {
            if (screen.id === screenId) {
                screen.classList.add('active');
            } else {
                screen.classList.remove('active');
            }
        });
        updateHeader(screenId);
        setActiveNav(screenId);
        if (screenId === 'search-screen') {
            refreshSearchView();
        }
    }

    function updateHeader(screenId) {
        if (screenId === 'bookshelf-screen') {
            headerTitle.textContent = '本棚';
        } else if (screenId === 'search-screen') {
            headerTitle.textContent = '検索';
        } else if (screenId === 'book-detail-screen') {
            const book = currentBookId ? appData.books[currentBookId] : null;
            headerTitle.textContent = book ? book.title : '書籍詳細';
        } else if (screenId === 'memo-form-screen') {
            headerTitle.textContent = memoFormState.editingMemoId ? 'メモを編集' : 'メモを追加';
        }
    }

    function setActiveNav(screenId) {
        const bookshelfActive = screenId === 'bookshelf-screen' || screenId === 'book-detail-screen' || screenId === 'memo-form-screen';
        navBookshelf.classList.toggle('active', bookshelfActive);
        navSearch.classList.toggle('active', screenId === 'search-screen');
    }

    function openMemoForm(bookId, memo = null) {
        memoFormState.editingBookId = bookId;
        memoFormState.editingMemoId = memo ? memo.id : null;
        memoFormState.photos = memo && memo.photos ? memo.photos.map(photo => ({ ...photo })) : [];
        memoTextInput.value = memo && memo.text ? memo.text : '';
        memoQuoteInput.value = memo && memo.quote ? memo.quote : '';
        memoTagInput.value = memo && memo.tags ? memo.tags.join(', ') : '';
        memoFormTitle.textContent = memo ? 'メモを編集' : 'メモを追加';
        renderMemoPhotoPreview();
        showScreen('memo-form-screen');
        setTimeout(() => memoTextInput.focus(), 0);
    }

    function resetMemoFormState() {
        memoForm.reset();
        memoFormState.editingBookId = null;
        memoFormState.editingMemoId = null;
        memoFormState.photos = [];
        renderMemoPhotoPreview();
    }

    function renderMemoPhotoPreview() {
        if (!memoPhotoPreview) {
            return;
        }
        if (!memoFormState.photos.length) {
            memoPhotoPreview.innerHTML = '<p class="placeholder">選択した写真はありません。</p>';
            return;
        }
        memoPhotoPreview.innerHTML = memoFormState.photos.map(photo => {
            const safeName = escapeHtml(photo.name);
            return `
                <div class="photo-preview-card">
                    <img src="${escapeHtml(photo.dataUrl)}" alt="${safeName}">
                    <button type="button" class="remove-photo-button" data-action="remove-photo" data-photo-id="${photo.id}" aria-label="この写真を削除">×</button>
                </div>
            `;
        }).join('');
    }

    function handlePhotoFiles(fileList) {
        const files = Array.from(fileList);
        if (!files.length) {
            return;
        }
        const maxPhotos = 6;
        const remainingSlots = maxPhotos - memoFormState.photos.length;
        if (remainingSlots <= 0) {
            alert('これ以上写真を追加できません。');
            return;
        }
        files.slice(0, remainingSlots).forEach(file => {
            if (!file.type.startsWith('image/')) {
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                memoFormState.photos.push({
                    id: generateId('photo'),
                    name: file.name,
                    dataUrl: reader.result
                });
                renderMemoPhotoPreview();
            };
            reader.readAsDataURL(file);
        });
    }

    function removePendingPhoto(photoId) {
        memoFormState.photos = memoFormState.photos.filter(photo => photo.id !== photoId);
        renderMemoPhotoPreview();
    }

    function parseTagInput(value) {
        if (!value) {
            return [];
        }
        return value.split(',')
            .map(tag => tag.trim())
            .filter(Boolean);
    }

    function handleMemoFormSubmit(event) {
        event.preventDefault();
        const bookId = memoFormState.editingBookId || currentBookId;
        if (!bookId) {
            alert('書籍が選択されていません。');
            return;
        }
        const book = appData.books[bookId];
        if (!book) {
            return;
        }
        const text = memoTextInput.value.trim();
        const quote = memoQuoteInput.value.trim();
        const tags = parseTagInput(memoTagInput.value);
        const photos = memoFormState.photos.map(photo => ({ ...photo }));
        if (!text && !quote && photos.length === 0) {
            alert('テキスト、引用、写真のいずれかを入力してください。');
            return;
        }
        const now = Date.now();
        if (memoFormState.editingMemoId) {
            const memo = book.memos.find(item => item.id === memoFormState.editingMemoId);
            if (!memo) {
                return;
            }
            memo.text = text;
            memo.quote = quote;
            memo.tags = tags;
            memo.photos = photos;
            memo.updatedAt = now;
        } else {
            const newMemo = {
                id: generateId('memo'),
                text,
                quote,
                tags,
                photos,
                createdAt: now,
                updatedAt: now
            };
            book.memos.unshift(newMemo);
        }
        saveData();
        resetMemoFormState();
        currentBookId = bookId;
        renderBookDetail();
        showScreen('book-detail-screen');
        updateTagSuggestions();
        updateSearchTagFilter();
    }

    function performSearch(query, selectedTags) {
        const normalizedQuery = (query || '').trim().toLowerCase();
        const requireQuery = normalizedQuery.length > 0;
        const requireTags = selectedTags && selectedTags.size > 0;
        if (!requireQuery && !requireTags) {
            return [];
        }
        const results = [];
        Object.values(appData.books).forEach(book => {
            book.memos.forEach(memo => {
                const combinedText = `${memo.text || ''} ${memo.quote || ''}`.toLowerCase();
                const bookInfo = `${book.title} ${book.author} ${book.isbn}`.toLowerCase();
                const tagsLower = memo.tags.map(tag => tag.toLowerCase());
                const matchesQuery = !requireQuery
                    || combinedText.includes(normalizedQuery)
                    || bookInfo.includes(normalizedQuery)
                    || tagsLower.some(tag => tag.includes(normalizedQuery));
                const matchesTags = !requireTags || Array.from(selectedTags).every(tag => memo.tags.includes(tag));
                if (matchesQuery && matchesTags) {
                    results.push({
                        bookId: book.id,
                        memo,
                        bookTitle: book.title,
                        bookAuthor: book.author,
                        bookCover: book.cover || defaultCover
                    });
                }
            });
        });
        results.sort((a, b) => b.memo.updatedAt - a.memo.updatedAt);
        return results;
    }

    function renderSearchResults(results) {
        if (!searchResultsContainer) {
            return;
        }
        if (!results.length) {
            searchResultsContainer.innerHTML = '<p class="placeholder">該当するメモがありません。</p>';
            return;
        }
        searchResultsContainer.innerHTML = results.map(result => {
            const memoHtml = createMemoItemHTML(result.memo, result.bookId, { tagAction: 'search' });
            return `
                <article class="search-result-card" data-book-id="${result.bookId}">
                    <div class="search-result-header">
                        <img src="${escapeHtml(result.bookCover)}" alt="${escapeHtml(result.bookTitle)}の表紙">
                        <div>
                            <p class="search-result-title">${escapeHtml(result.bookTitle)}</p>
                            <p class="search-result-author">${escapeHtml(result.bookAuthor)}</p>
                        </div>
                        <button type="button" class="secondary small" data-action="open-book-from-search" data-book-id="${result.bookId}">詳細を開く</button>
                    </div>
                    ${memoHtml}
                </article>
            `;
        }).join('');
    }

    function refreshSearchView() {
        const hasQuery = searchInput.value.trim().length > 0;
        if (!hasQuery && searchState.tags.size === 0) {
            searchResultsContainer.innerHTML = '<p class="placeholder">キーワードまたはタグを指定してください。</p>';
            return;
        }
        const results = performSearch(searchInput.value, searchState.tags);
        renderSearchResults(results);
    }

    function openBookModal() {
        bookModal.classList.remove('hidden');
        document.body.classList.add('modal-open');
        clearBookSearchResults();
        setTimeout(() => bookTitleInput.focus(), 0);
    }

    function closeBookModal() {
        if (scanModal && !scanModal.classList.contains('hidden')) {
            closeScanModal();
        }
        bookModal.classList.add('hidden');
        document.body.classList.remove('modal-open');
        resetBookForm();
    }

    function resetBookForm() {
        bookForm.reset();
        bookCoverDraft = null;
        updateBookCoverPreview('');
        clearBookSearchResults();
    }

    function handleBookFormSubmit(event) {
        event.preventDefault();
        const title = bookTitleInput.value.trim();
        if (!title) {
            alert('タイトルを入力してください。');
            return;
        }
        const author = bookAuthorInput.value.trim() || '著者未設定';
        const isbn = bookIsbnInput.value.trim();
        const coverUrl = bookCoverUrlInput.value.trim();
        const cover = bookCoverDraft || coverUrl || defaultCover;
        const newBookId = generateId('book');
        const now = Date.now();
        appData.books[newBookId] = {
            id: newBookId,
            title,
            author,
            isbn,
            cover,
            createdAt: now,
            memos: []
        };
        saveData();
        closeBookModal();
        renderBookshelf();
        updateTagSuggestions();
        updateSearchTagFilter();
        currentBookId = newBookId;
        activeBookTagFilter = null;
        renderBookDetail();
        showScreen('book-detail-screen');
    }

    function updateBookCoverPreview(src) {
        if (!bookCoverPreview) {
            return;
        }
        if (src) {
            bookCoverPreview.src = src;
            bookCoverPreview.hidden = false;
        } else {
            bookCoverPreview.src = '';
            bookCoverPreview.hidden = true;
        }
    }

    // ==================== バーコードスキャン機能（改善版） ====================

    // ブラウザがBarcodeDetector APIをサポートしているか確認
    async function checkBarcodeDetectorSupport() {
        if ('BarcodeDetector' in window) {
            try {
                const formats = await window.BarcodeDetector.getSupportedFormats();
                useBarcodeDetectorAPI = formats.includes('ean_13');
                console.log('BarcodeDetector API available:', useBarcodeDetectorAPI);
                return useBarcodeDetectorAPI;
            } catch (error) {
                console.warn('BarcodeDetector check failed:', error);
                return false;
            }
        }
        return false;
    }

    // BarcodeDetector APIを使用したスキャン（高速・ネイティブ対応）
    async function initBarcodeDetector() {
        if (!barcodeDetector && useBarcodeDetectorAPI) {
            try {
                barcodeDetector = new window.BarcodeDetector({
                    formats: ['ean_13', 'ean_8']
                });
                console.log('BarcodeDetector initialized');
            } catch (error) {
                console.error('Failed to initialize BarcodeDetector:', error);
                useBarcodeDetectorAPI = false;
            }
        }
        return barcodeDetector;
    }

    // BarcodeDetector APIを使用した連続スキャン
    async function startBarcodeDetectorScan(videoElement) {
        const detector = await initBarcodeDetector();
        if (!detector) {
            return null;
        }

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        let isScanning = true;
        let lastScanTime = 0;
        const scanInterval = 300; // 300msごとにスキャン

        const scanLoop = async () => {
            if (!isScanning || !videoElement.videoWidth) {
                return;
            }

            const now = Date.now();
            if (now - lastScanTime < scanInterval) {
                requestAnimationFrame(scanLoop);
                return;
            }
            lastScanTime = now;

            try {
                canvas.width = videoElement.videoWidth;
                canvas.height = videoElement.videoHeight;
                context.drawImage(videoElement, 0, 0);

                const barcodes = await detector.detect(canvas);
                if (barcodes.length > 0) {
                    const barcode = barcodes[0];
                    console.log('Barcode detected:', barcode.rawValue, barcode.format);
                    if (barcode.format === 'ean_13' || barcode.format === 'ean_8') {
                        handleScanResult(barcode.rawValue);
                        return; // スキャン成功したら停止
                    }
                }
            } catch (error) {
                console.warn('Barcode detection error:', error);
            }

            requestAnimationFrame(scanLoop);
        };

        scanLoop();

        return {
            stop: () => {
                isScanning = false;
            }
        };
    }

    // ZXing libraryの初期化（フォールバック）
    async function ensureBarcodeReader() {
        if (barcodeReader) {
            return barcodeReader;
        }
        if (!barcodeModule) {
            try {
                // 最新の安定版を使用
                barcodeModule = await import('https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm');
                console.log('ZXing library loaded');
            } catch (error) {
                console.error('Failed to load ZXing library:', error);
                throw error;
            }
        }
        
        const hints = new Map();
        const formats = [
            barcodeModule.BarcodeFormat.EAN_13,
            barcodeModule.BarcodeFormat.EAN_8,
            barcodeModule.BarcodeFormat.CODE_128
        ];
        hints.set(barcodeModule.DecodeHintType.POSSIBLE_FORMATS, formats);
        hints.set(barcodeModule.DecodeHintType.TRY_HARDER, true);
        
        barcodeReader = new barcodeModule.BrowserMultiFormatReader(hints);
        console.log('ZXing BarcodeReader initialized');
        return barcodeReader;
    }

    // カメラストリームの開始（改善版）
    async function startCameraStream() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('カメラAPIがサポートされていません');
        }

        const constraints = {
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1920, max: 1920 },
                height: { ideal: 1080, max: 1080 },
                frameRate: { ideal: 30 }
            }
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('Camera stream started');
            return stream;
        } catch (error) {
            // 環境カメラが使えない場合はフロントカメラにフォールバック
            if (error.name === 'OverconstrainedError') {
                const fallbackConstraints = {
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                };
                const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
                console.log('Camera stream started (fallback mode)');
                return stream;
            }
            throw error;
        }
    }

    // ISBN正規化の改善版
    async function searchBooksByKeyword(query) {
        try {
            // 1. Google Books APIで検索
            const googleUrl = new URL('https://www.googleapis.com/books/v1/volumes');
            googleUrl.searchParams.set('q', `intitle:${query}`);
            googleUrl.searchParams.set('langRestrict', 'ja');
            googleUrl.searchParams.set('maxResults', '10');
            googleUrl.searchParams.set('printType', 'books');

            const googleResponse = await fetch(googleUrl.toString());
            if (googleResponse.ok) {
                const googleData = await googleResponse.json();
                if (googleData.items && googleData.items.length > 0) {
                    return googleData.items.map(item => {
                        const info = item.volumeInfo;
                        const isbn13 = info.industryIdentifiers?.find(i => i.type === 'ISBN_13')?.identifier;
                        const isbn10 = info.industryIdentifiers?.find(i => i.type === 'ISBN_10')?.identifier;
                        const cover = info.imageLinks?.thumbnail?.replace('http:', 'https:') || 
                                      info.imageLinks?.smallThumbnail?.replace('http:', 'https:') || '';
                        return {
                            title: info.title || '',
                            author: info.authors ? info.authors.join(', ') : '',
                            isbn: isbn13 || isbn10 || '',
                            cover: cover,
                            year: info.publishedDate ? info.publishedDate.substring(0, 4) : ''
                        };
                    }).filter(item => item.title);
                }
            }

            // 2. Open Library API (フォールバック)
            const openLibUrl = new URL('https://openlibrary.org/search.json');
            openLibUrl.searchParams.set('title', query);
            openLibUrl.searchParams.set('limit', '10');
            openLibUrl.searchParams.set('fields', 'title,author_name,isbn,cover_i,first_publish_year');
            const openLibResponse = await fetch(openLibUrl.toString(), { cache: 'no-cache' });
            if (!openLibResponse.ok) {
                throw new Error(`Search request failed with status ${openLibResponse.status}`);
            }
            const openLibData = await openLibResponse.json();
            if (!openLibData.docs || !Array.isArray(openLibData.docs)) {
                return [];
            }
            return openLibData.docs.map(doc => {
                const isbnList = Array.isArray(doc.isbn) ? doc.isbn : [];
                const candidateIsbn = isbnList.find(code => code && (code.length === 13 || code.length === 10));
                const coverId = typeof doc.cover_i === 'number' && doc.cover_i > 0 ? doc.cover_i : null;
                return {
                    title: doc.title || '',
                    author: Array.isArray(doc.author_name) ? doc.author_name.join(', ') : '',
                    isbn: candidateIsbn || '',
                    cover: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : '',
                    year: doc.first_publish_year ? String(doc.first_publish_year) : ''
                };
            }).filter(item => item.title);

        } catch (error) {
            console.error('Failed to search books', error);
            throw error;
        }
    }

    function renderBookSearchResults(results, query) {
        if (!bookSearchResults) {
            return;
        }
        if (!results || results.length === 0) {
            bookSearchResults.innerHTML = `<p class="placeholder">「${escapeHtml(query)}」に一致する結果が見つかりませんでした。</p>`;
            bookSearchResults.hidden = false;
            return;
        }
        const items = results.map((item, index) => {
            const safeTitle = escapeHtml(item.title);
            const safeAuthor = escapeHtml(item.author || '著者情報なし');
            const metaParts = [safeAuthor];
            if (item.year) {
                metaParts.push(`初版: ${escapeHtml(item.year)}`);
            }
            const metaText = metaParts.filter(Boolean).join(' / ');
            return `
                <button type="button" class="book-search-result" data-search-index="${index}">
                    <span class="book-search-result-title">${safeTitle}</span>
                    <span class="book-search-result-meta">${metaText}</span>
                </button>
            `;
        }).join('');
        bookSearchResults.innerHTML = items;
        bookSearchResults.hidden = false;
    }

    function clearBookSearchResults() {
        if (!bookSearchResults) {
            return;
        }
        bookSearchResults.innerHTML = '';
        bookSearchResults.hidden = true;
        bookSearchState.results = [];
        bookSearchState.isLoading = false;
    }

    function setBookSearchLoading(message) {
        if (!bookSearchResults) {
            return;
        }
        bookSearchResults.innerHTML = `<p class="placeholder">${escapeHtml(message)}</p>`;
        bookSearchResults.hidden = false;
    }

    function normalizeIsbn(rawValue) {
        if (!rawValue) {
            return null;
        }
        
        // 数字とX（ISBN-10のチェックディジット）のみを抽出
        const digits = rawValue.replace(/[^0-9Xx]/g, '').toUpperCase();
        
        // EAN-13 (ISBN-13) または EAN-8をサポート
        if (digits.length === 13) {
            // ISBN-13として扱う（最初の3桁が978または979であることを確認）
            if (digits.startsWith('978') || digits.startsWith('979')) {
                return digits;
            }
            // 通常のEAN-13としても受け入れる
            return digits;
        } else if (digits.length === 10) {
            // ISBN-10
            return digits;
        } else if (digits.length === 8) {
            // EAN-8（短縮版）
            return digits;
        }
        
        return null;
    }

    function setScanStatus(message) {
        if (scanStatus) {
            scanStatus.textContent = message;
        }
    }

    async function openScanModal() {
        if (!scanModal) {
            return;
        }
        if (!window.isSecureContext && location.hostname !== 'localhost') {
            setScanStatus('HTTPS もしくは localhost でアクセスするとカメラが利用できます。手動入力をご利用ください。');
            scanModal.classList.remove('hidden');
            document.body.classList.add('modal-open');
            return;
        }
        if (scanVideo) {
            scanVideo.setAttribute('playsinline', 'true');
        }
        setScanStatus('カメラを初期化しています…');
        scanModal.classList.remove('hidden');
        document.body.classList.add('modal-open');
        await startBarcodeScan();
    }

    function closeScanModal() {
        if (!scanModal) {
            return;
        }
        stopBarcodeScan();
        if (scanModal.classList.contains('hidden')) {
            return;
        }
        scanModal.classList.add('hidden');
        if (bookModal.classList.contains('hidden')) {
            document.body.classList.remove('modal-open');
        }
        setScanStatus('バーコードが映るように端末をかざしてください。');
        isProcessingScan = false;
    }

    // バーコードスキャンの開始（統合版）
    async function startBarcodeScan() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setScanStatus('ブラウザがカメラアクセスに対応していません。手動入力をご利用ください。');
            return;
        }

        setScanStatus('カメラを初期化しています…');
        let stream = null;

        try {
            // BarcodeDetector APIのサポートを確認
            const hasNativeSupport = await checkBarcodeDetectorSupport();
            
            // カメラストリームを開始
            stream = await startCameraStream();
            
            if (scanVideo) {
                scanVideo.srcObject = stream;
                scanVideo.setAttribute('playsinline', 'true');
                scanVideo.setAttribute('muted', 'true');
                
                // ビデオが再生可能になるまで待機
                await new Promise((resolve) => {
                    scanVideo.onloadedmetadata = () => {
                        scanVideo.play().then(resolve).catch(resolve);
                    };
                });
            }

            // BarcodeDetector APIを優先的に使用
            if (hasNativeSupport && scanVideo) {
                setScanStatus('バーコードが映るように端末をかざしてください。');
                const detectorControls = await startBarcodeDetectorScan(scanVideo);
                
                scanControls = {
                    stop: () => {
                        if (detectorControls) {
                            detectorControls.stop();
                        }
                        if (stream) {
                            stream.getTracks().forEach(track => track.stop());
                        }
                        if (scanVideo) {
                            scanVideo.srcObject = null;
                        }
                    }
                };
            } else {
                // ZXingをフォールバックとして使用
                setScanStatus('バーコードが映るように端末をかざしてください。');
                const reader = await ensureBarcodeReader();
                
                const handleResult = (result, error) => {
                    if (result) {
                        const value = typeof result.getText === 'function' 
                            ? result.getText() 
                            : result.text;
                        console.log('Barcode scanned (ZXing):', value);
                        handleScanResult(value);
                    } else if (error) {
                        const isEmptyFrame = barcodeModule && 
                            barcodeModule.NotFoundException && 
                            error instanceof barcodeModule.NotFoundException;
                        if (!isEmptyFrame) {
                            console.warn('Barcode scan error:', error);
                        }
                    }
                };

                if (typeof reader.decodeFromVideoElementContinuously === 'function') {
                    reader.decodeFromVideoElementContinuously(scanVideo, handleResult);
                } else {
                    reader.decodeFromVideoElement(scanVideo, handleResult);
                }

                scanControls = {
                    stop: () => {
                        reader.reset();
                        if (stream) {
                            stream.getTracks().forEach(track => track.stop());
                        }
                        if (scanVideo) {
                            scanVideo.srcObject = null;
                        }
                    }
                };
            }

            isProcessingScan = false;
            
        } catch (error) {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (scanVideo) {
                scanVideo.srcObject = null;
            }
            scanControls = null;

            if (error && error.name === 'NotAllowedError') {
                setScanStatus('カメラへのアクセスが許可されませんでした。ブラウザの設定を確認してください。');
            } else if (error && (error.name === 'NotFoundError' || error.name === 'OverconstrainedError')) {
                setScanStatus('利用できるカメラが見つかりませんでした。手動入力をご利用ください。');
            } else {
                setScanStatus('カメラを起動できませんでした。手動入力をご利用ください。');
            }
            
            isProcessingScan = false;
            console.error('Failed to start barcode scanning:', error);
        }
    }

    function stopBarcodeScan() {
        if (barcodeReader) {
            barcodeReader.reset();
        }
        if (scanControls) {
            try {
                scanControls.stop();
            } catch (error) {
                console.warn('Failed to stop scan controls', error);
            }
            scanControls = null;
        }
        if (scanVideo && scanVideo.srcObject) {
            const tracks = scanVideo.srcObject.getTracks ? scanVideo.srcObject.getTracks() : [];
            tracks.forEach(track => track.stop());
            scanVideo.srcObject = null;
        }
    }

    // スキャン結果の処理（改善版）
    async function handleScanResult(rawValue) {
        if (!rawValue || isProcessingScan) {
            return;
        }
        
        const normalized = normalizeIsbn(rawValue);
        if (!normalized) {
            setScanStatus(`コードを読み取りましたが、ISBNとして認識できませんでした。`);
            console.log('Invalid ISBN format:', rawValue);
            return;
        }
        
        isProcessingScan = true;
        setScanStatus(`ISBN ${normalized} を取得しました。書籍情報を検索しています…`);
        console.log('Valid ISBN detected:', normalized);
        
        // スキャンを停止
        stopBarcodeScan();
        
        // フォームにISBNを設定
        prefillBookFormWithData({ isbn: normalized });
        
        // 書籍情報を取得
        try {
            const bookData = await fetchBookDataByIsbn(normalized);
            if (bookData) {
                prefillBookFormWithData(bookData);
                closeScanModal();
                if (bookModal.classList.contains('hidden')) {
                    openBookModal();
                }
                setTimeout(() => bookTitleInput.focus(), 0);
                setScanStatus('書籍情報を取得しました。');
            } else {
                setScanStatus(`ISBN ${normalized} の書籍情報を取得できませんでした。手動で入力してください。`);
                isProcessingScan = false;
            }
        } catch (error) {
            console.error('Failed to fetch book data:', error);
            setScanStatus('書籍情報の取得中にエラーが発生しました。手動で入力してください。');
            isProcessingScan = false;
        }
    }

    async function fetchBookDataByIsbn(isbn) {
        try {
            // まずGoogle Books APIを試す
            const googleResponse = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
            if (googleResponse.ok) {
                const googleData = await googleResponse.json();
                if (googleData.items && googleData.items.length > 0) {
                    const bookInfo = googleData.items[0].volumeInfo;
                    return {
                        title: bookInfo.title || '',
                        author: bookInfo.authors ? bookInfo.authors.join(', ') : '著者未設定',
                        cover: bookInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || 
                               bookInfo.imageLinks?.smallThumbnail?.replace('http:', 'https:') || '',
                        isbn
                    };
                }
            }

            // Google Books APIで見つからない場合はOpen Libraryを試す
            const openLibResponse = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
            if (!openLibResponse.ok) {
                return null;
            }
            const data = await openLibResponse.json();
            let authorName = '';
            if (Array.isArray(data.authors) && data.authors.length > 0 && data.authors[0].key) {
                try {
                    const authorResp = await fetch(`https://openlibrary.org${data.authors[0].key}.json`);
                    if (authorResp.ok) {
                        const authorData = await authorResp.json();
                        authorName = authorData.name || '';
                    }
                } catch (authorError) {
                    console.warn('Failed to fetch author metadata', authorError);
                }
            }
            const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
            return {
                title: data.title || '',
                author: authorName || data.by_statement || '著者未設定',
                cover: coverUrl,
                isbn
            };
        } catch (error) {
            console.error('Failed to fetch book metadata', error);
            return null;
        }
    }

    function prefillBookFormWithData(data) {
        if (!data) {
            return;
        }
        if (data.title) {
            bookTitleInput.value = data.title;
        }
        if (data.author) {
            bookAuthorInput.value = data.author;
        }
        if (data.isbn) {
            bookIsbnInput.value = data.isbn;
        }
        if (data.cover) {
            bookCoverUrlInput.value = data.cover;
            bookCoverDraft = null;
            updateBookCoverPreview(data.cover);
        }
    }

    // ==================== イベントハンドラー ====================

    function handleDeleteMemo(bookId, memoId) {
        if (!bookId || !memoId) {
            return;
        }
        const book = appData.books[bookId];
        if (!book) {
            return;
        }
        if (!confirm('このメモを削除しますか?')) {
            return;
        }
        book.memos = book.memos.filter(memo => memo.id !== memoId);
        saveData();
        if (bookId === currentBookId) {
            renderBookDetail();
        }
        updateTagSuggestions();
        updateSearchTagFilter();
        if (searchScreen && searchScreen.classList.contains('active')) {
            refreshSearchView();
        }
    }

    function handleStartEdit(bookId, memoId) {
        if (!bookId || !memoId) {
            return;
        }
        const book = appData.books[bookId];
        if (!book) {
            return;
        }
        const memo = book.memos.find(item => item.id === memoId);
        if (!memo) {
            return;
        }
        currentBookId = bookId;
        openMemoForm(bookId, memo);
    }

    function handleDeleteBook(bookId) {
        if (!bookId) {
            return;
        }
        const book = appData.books[bookId];
        if (!book) {
            return;
        }
        if (!confirm(`「${book.title}」を削除しますか?\n登録済みのメモもすべて削除されます。`)) {
            return;
        }
        delete appData.books[bookId];
        if (currentBookId === bookId) {
            currentBookId = null;
        }
        activeBookTagFilter = null;
        saveData();
        renderBookshelf();
        updateTagSuggestions();
        updateSearchTagFilter();
        if (searchScreen && searchScreen.classList.contains('active')) {
            refreshSearchView();
        }
        alert(`「${book.title}」を削除しました。`);
        showScreen('bookshelf-screen');
    }

    function handleBookTagFilter(tagValue) {
        activeBookTagFilter = tagValue ? tagValue : null;
        renderBookDetail();
    }

    function applyBookTag(tag) {
        if (!tag) {
            activeBookTagFilter = null;
        } else if (activeBookTagFilter === tag) {
            activeBookTagFilter = null;
        } else {
            activeBookTagFilter = tag;
        }
        renderBookDetail();
    }

    function applySearchTag(tag) {
        if (!tag) {
            return;
        }
        if (searchState.tags.has(tag)) {
            searchState.tags.delete(tag);
        } else {
            searchState.tags.add(tag);
        }
        updateSearchTagFilter();
        showScreen('search-screen');
    }

    function openBookFromSearch(bookId) {
        if (!bookId || !appData.books[bookId]) {
            return;
        }
        currentBookId = bookId;
        activeBookTagFilter = null;
        renderBookDetail();
        showScreen('book-detail-screen');
    }

    // ==================== イベントリスナー ====================

    if (bookListContainer) {
        bookListContainer.addEventListener('click', event => {
            const card = event.target.closest('.book-item');
            if (!card) {
                return;
            }
            const bookId = card.dataset.bookId;
            if (!bookId || !appData.books[bookId]) {
                return;
            }
            currentBookId = bookId;
            activeBookTagFilter = null;
            renderBookDetail();
            showScreen('book-detail-screen');
        });
    }

    memoForm.addEventListener('submit', handleMemoFormSubmit);

    memoCancelButton.addEventListener('click', () => {
        resetMemoFormState();
        if (currentBookId && appData.books[currentBookId]) {
            renderBookDetail();
            showScreen('book-detail-screen');
        } else {
            showScreen('bookshelf-screen');
        }
    });

    attachPhotoButton.addEventListener('click', () => {
        photoInput.click();
    });

    photoInput.addEventListener('change', event => {
        handlePhotoFiles(event.target.files);
        photoInput.value = '';
    });

    if (memoTagSuggestions) {
        memoTagSuggestions.addEventListener('click', event => {
            const tagButton = event.target.closest('[data-action="append-tag"]');
            if (!tagButton) {
                return;
            }
            const tag = tagButton.dataset.tag;
            if (!tag) {
                return;
            }
            const existing = parseTagInput(memoTagInput.value);
            if (!existing.includes(tag)) {
                existing.push(tag);
                memoTagInput.value = existing.join(', ');
            }
            memoTagInput.focus();
        });
    }

    searchInput.addEventListener('input', () => {
        refreshSearchView();
    });

    clearSearchButton.addEventListener('click', () => {
        searchInput.value = '';
        searchState.tags.clear();
        updateSearchTagFilter();
        refreshSearchView();
    });

    if (searchTagFilter) {
        searchTagFilter.addEventListener('click', event => {
            const tagButton = event.target.closest('[data-action="toggle-search-tag"]');
            if (!tagButton) {
                return;
            }
            const tag = tagButton.dataset.tag;
            if (!tag) {
                return;
            }
            if (searchState.tags.has(tag)) {
                searchState.tags.delete(tag);
            } else {
                searchState.tags.add(tag);
            }
            updateSearchTagFilter();
            refreshSearchView();
        });
    }

    navBookshelf.addEventListener('click', () => {
        showScreen('bookshelf-screen');
    });

    navSearch.addEventListener('click', () => {
        showScreen('search-screen');
        searchInput.focus();
    });

    searchButton.addEventListener('click', () => {
        showScreen('search-screen');
        searchInput.focus();
    });

    addBookButton.addEventListener('click', () => {
        openBookModal();
    });

    bookForm.addEventListener('submit', handleBookFormSubmit);

    bookFormCancel.addEventListener('click', closeBookModal);
    bookModalClose.addEventListener('click', closeBookModal);
    if (bookModalBackdrop) {
        bookModalBackdrop.addEventListener('click', closeBookModal);
    }

    bookCoverInput.addEventListener('change', event => {
        const file = event.target.files && event.target.files[0];
        if (!file) {
            return;
        }
        if (!file.type.startsWith('image/')) {
            alert('画像ファイルを選択してください。');
            bookCoverInput.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            bookCoverDraft = reader.result;
            updateBookCoverPreview(bookCoverDraft);
        };
        reader.readAsDataURL(file);
    });

    bookCoverUrlInput.addEventListener('input', () => {
        if (bookCoverDraft) {
            return;
        }
        const url = bookCoverUrlInput.value.trim();
        updateBookCoverPreview(url);
    });

    if (bookSearchButton) {
        bookSearchButton.addEventListener('click', async () => {
            const query = bookTitleInput.value.trim();
            if (!query) {
                alert('検索するタイトルを入力してください。');
                return;
            }
            try {
                bookSearchState.isLoading = true;
                setBookSearchLoading('検索中...');
                const results = await searchBooksByKeyword(query);
                bookSearchState.results = results;
                bookSearchState.isLoading = false;
                renderBookSearchResults(results, query);
            } catch (error) {
                bookSearchState.isLoading = false;
                if (bookSearchResults) {
                    bookSearchResults.innerHTML = '<p class="placeholder">検索中にエラーが発生しました。時間をおいて再度お試しください。</p>';
                    bookSearchResults.hidden = false;
                }
            }
        });
    }

    if (bookSearchResults) {
        bookSearchResults.addEventListener('click', event => {
            const button = event.target.closest('.book-search-result');
            if (!button) {
                return;
            }
            const index = Number(button.dataset.searchIndex);
            const item = Number.isNaN(index) ? null : bookSearchState.results[index];
            if (!item) {
                return;
            }
            prefillBookFormWithData(item);
            if (item.title) {
                bookTitleInput.value = item.title;
            }
            clearBookSearchResults();
        });
    }

    if (bookScanButton) {
        bookScanButton.addEventListener('click', () => {
            openScanModal().catch(error => console.error('Failed to open scan modal', error));
        });
    }

    if (scanCancelButton) {
        scanCancelButton.addEventListener('click', () => {
            closeScanModal();
        });
    }

    if (scanModalClose) {
        scanModalClose.addEventListener('click', () => {
            closeScanModal();
        });
    }

    if (scanModalBackdrop) {
        scanModalBackdrop.addEventListener('click', () => {
            closeScanModal();
        });
    }

    if (scanRetryButton) {
        scanRetryButton.addEventListener('click', () => {
            stopBarcodeScan();
            setScanStatus('カメラを初期化しています…');
            startBarcodeScan().catch(error => console.error('Failed to restart barcode scan', error));
        });
    }

    document.body.addEventListener('click', event => {
        const actionButton = event.target.closest('[data-action]');
        if (!actionButton) {
            return;
        }
        const action = actionButton.dataset.action;
        switch (action) {
            case 'delete-memo':
                handleDeleteMemo(actionButton.dataset.bookId, actionButton.dataset.memoId);
                break;
            case 'edit-memo':
                handleStartEdit(actionButton.dataset.bookId, actionButton.dataset.memoId);
                break;
            case 'remove-photo':
                removePendingPhoto(actionButton.dataset.photoId);
                break;
            case 'filter-book-tag':
                handleBookTagFilter(actionButton.dataset.tag);
                break;
            case 'apply-book-tag':
                applyBookTag(actionButton.dataset.tag);
                break;
            case 'apply-search-tag':
                applySearchTag(actionButton.dataset.tag);
                break;
            case 'open-book-from-search':
                openBookFromSearch(actionButton.dataset.bookId);
                break;
            case 'delete-book':
                handleDeleteBook(actionButton.dataset.bookId);
                break;
            case 'back-to-bookshelf':
                currentBookId = null;
                activeBookTagFilter = null;
                showScreen('bookshelf-screen');
                break;
            default:
                break;
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            if (scanModal && !scanModal.classList.contains('hidden')) {
                closeScanModal();
                return;
            }
            if (!bookModal.classList.contains('hidden')) {
                closeBookModal();
            } else if (memoFormScreen.classList.contains('active')) {
                memoCancelButton.click();
            }
        }
    });

    // ==================== 初期化 ====================

    function init() {
        loadData();
        renderBookshelf();
        renderMemoPhotoPreview();
        updateTagSuggestions();
        updateSearchTagFilter();
        searchResultsContainer.innerHTML = '<p class="placeholder">キーワードまたはタグを指定してください。</p>';
        showScreen('bookshelf-screen');
    }

    init();
});