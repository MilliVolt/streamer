class EarlyExitError extends Error {
    constructor(message) {
        super(message);
        this.message = message;
        this.name = 'EarlyExit';
    }
}

class OverDurationError extends Error {
    constructor(message) {
        super(message);
        this.message = message;
        this.name = 'OverDuration';
    }
}

exports.EarlyExitError = EarlyExitError;
exports.OverDurationError = OverDurationError;

