let _nextPieceId = 1;

export class FractionsEngine {
    #showDecimal = false;
    #showPercent = false;
    #pieces      = [];
    #listeners   = new Set();

    setShowDecimal(bool) {
        this.#showDecimal = !!bool;
        this.#emit();
    }

    setShowPercent(bool) {
        this.#showPercent = !!bool;
        this.#emit();
    }

    getOptions() {
        return Object.freeze({
            showDecimal: this.#showDecimal,
            showPercent: this.#showPercent,
        });
    }

    // ── Piece persistence ─────────────────────────────────────────────────────

    addPiece(data) {
        const piece = { id: _nextPieceId++, ...data };
        this.#pieces.push(piece);
        return piece.id;
    }

    updatePiece(id, partial) {
        const piece = this.#pieces.find(p => p.id === id);
        if (piece) Object.assign(piece, partial);
    }

    clearPieces() {
        this.#pieces = [];
    }

    getPieces() {
        return this.#pieces.map(p => ({ ...p }));
    }

    // ── Subscription ──────────────────────────────────────────────────────────

    subscribe(listener) {
        this.#listeners.add(listener);
        listener(this.getOptions());
        return () => this.#listeners.delete(listener);
    }

    #emit() {
        const opts = this.getOptions();
        for (const l of this.#listeners) l(opts);
    }
}
