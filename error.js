class ExistError extends Error {
    constructor(message) {
        super(message);
        this.message = message;
        this.name = 'ExistError';
    }
}

class OverDurationError extends Error {
    constructor(message) {
        super(message);
        this.message = message;
        this.name = 'OverDuration';
    }
}

class DatabaseError extends Error {
    constructor(message) {
        super(message);
        this.message = message;
        this.name = 'DatabaseError';
    }
}
exports.ExistError = ExistError;
exports.OverDurationError = OverDurationError;
exports.DatabaseError = DatabaseError;

