// 400 error
class BadRequestException extends Error {
    constructor(message) {
        super(message);
        this.name = "BadRequestException";
        this.status = 400;
    }
}

// 401 error
class UnauthorizedException extends Error {
    constructor(message) {
        super(message);
        this.name = "TokenInvalidException";
        this.status = 401;
    }
}

// 403 error
class ForbbidenException extends Error {
    constructor(message) {
        super(message);
        this.name = "ForbbidenException";
        this.status = 403;
    }
}

// 404 error
class NotFoundException extends Error {
    constructor(message) {
        super(message);
        this.name = "NotFoundException";
        this.status = 404;
    }
}

// 500 error
class InternerServerException extends Error {
    constructor() {
        super("서버에서 오류가 발생하였습니다");
        this.name = "InternerServerException";
        this.status = 500;
    }
}

module.exports = {
    BadRequestException,
    UnauthorizedException,
    ForbbidenException,
    NotFoundException,
    InternerServerException
};
