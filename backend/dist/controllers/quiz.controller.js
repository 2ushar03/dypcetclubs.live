"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQuizResults = exports.submitQuiz = exports.createQuizUser = exports.getQuizById = exports.getClubQuizzes = exports.createQuiz = void 0;
const database_config_1 = require("../config/database.config");
const bcrypt_1 = __importDefault(require("bcrypt"));
const const_1 = require("../config/const");
const logger_1 = __importDefault(require("../config/logger")); // Import Winston logger
const createQuiz = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, questions, secretCode } = req.body;
    const clubId = Number(req.query.ClubID);
    if (!secretCode || typeof secretCode !== "string") {
        logger_1.default.warn("Invalid or missing secret code during quiz creation.");
        return res.status(400).json({ error: const_1.MESSAGES.QUIZ.INVALID_SECRET_CODE });
    }
    try {
        const hashedSecretCode = yield bcrypt_1.default.hash(secretCode, 10);
        const quiz = yield database_config_1.prisma.quiz.create({
            data: {
                title,
                secretCode: hashedSecretCode,
                clubId: clubId,
            },
        });
        yield Promise.all(questions.map((q) => database_config_1.prisma.question.create({
            data: {
                question: q.question,
                options: q.options,
                correctAnswer: q.correctAnswer,
                quizId: quiz.id,
            },
        })));
        logger_1.default.info(`Quiz created successfully: ${title} for ClubID: ${clubId}`);
        res.status(201).json({ quizId: quiz.id });
    }
    catch (error) {
        logger_1.default.error(`${const_1.MESSAGES.QUIZ.ERROR_CREATING_QUIZ}: ${error}`);
        res.status(500).json({ error: const_1.MESSAGES.QUIZ.ERROR_CREATING_QUIZ });
    }
});
exports.createQuiz = createQuiz;
const getClubQuizzes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const clubId = Number(req.query.ClubID);
    try {
        const quizzes = yield database_config_1.prisma.quiz.findMany({
            where: { clubId: clubId },
            select: { id: true, title: true, createdAt: true },
        });
        logger_1.default.info(`Fetched quizzes for ClubID: ${clubId}`);
        res.json(quizzes);
    }
    catch (error) {
        logger_1.default.error(`${const_1.MESSAGES.QUIZ.ERROR_FETCHING_QUIZZES}: ${error}`);
        res.status(500).json({ error: const_1.MESSAGES.QUIZ.ERROR_FETCHING_QUIZZES });
    }
});
exports.getClubQuizzes = getClubQuizzes;
// Get quiz by ID
const getQuizById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { secretCode } = req.body;
    try {
        const quiz = yield database_config_1.prisma.quiz.findUnique({
            where: { id: parseInt(id) },
            include: { questions: true },
        });
        if (!quiz) {
            logger_1.default.warn(`Quiz not found for ID: ${id}`);
            return res.status(404).json({ error: const_1.MESSAGES.QUIZ.QUIZ_NOT_FOUND });
        }
        const isSecretCodeValid = yield bcrypt_1.default.compare(secretCode, quiz.secretCode);
        if (!isSecretCodeValid) {
            logger_1.default.warn(`Invalid secret code for quiz ID: ${id}`);
            return res.status(403).json({ error: const_1.MESSAGES.QUIZ.INVALID_SECRET_CODE });
        }
        logger_1.default.info(`Fetched quiz by ID: ${id}`);
        res.json(quiz);
    }
    catch (error) {
        logger_1.default.error(`${const_1.MESSAGES.QUIZ.ERROR_FETCHING_QUIZ}: ${error}`);
        res.status(500).json({ error: const_1.MESSAGES.QUIZ.ERROR_FETCHING_QUIZ });
    }
});
exports.getQuizById = getQuizById;
// Create a quiz user
const createQuizUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, rollNo, year } = req.body;
    const parsedYear = parseInt(year);
    try {
        const user = yield database_config_1.prisma.user.create({
            data: { name, rollNo, year: parsedYear },
        });
        logger_1.default.info(`Created quiz user: ${name}`);
        res.status(201).json(user);
    }
    catch (error) {
        logger_1.default.error(`${const_1.MESSAGES.USER.ERROR_CREATING_USER}: ${error}`);
        res.status(500).json({ error: const_1.MESSAGES.USER.ERROR_CREATING_USER });
    }
});
exports.createQuizUser = createQuizUser;
// Submit quiz result
const submitQuiz = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { userId, answers, score } = req.body;
    try {
        const result = yield database_config_1.prisma.result.create({
            data: {
                score,
                answers: JSON.stringify(answers),
                quiz: { connect: { id: parseInt(id) } },
                user: { connect: { id: userId } },
            },
        });
        logger_1.default.info(`Quiz result submitted for quiz ID: ${id} by user ID: ${userId}`);
        res.status(201).json(result);
    }
    catch (error) {
        logger_1.default.error(`${const_1.MESSAGES.QUIZ.ERROR_SUBMITTING_QUIZ_RESULT}: ${error}`);
        res.status(500).json({ error: const_1.MESSAGES.QUIZ.ERROR_SUBMITTING_QUIZ_RESULT });
    }
});
exports.submitQuiz = submitQuiz;
// Get quiz results by quiz ID
const getQuizResults = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const clubId = Number(req.query.ClubID);
    try {
        const quiz = yield database_config_1.prisma.quiz.findUnique({
            where: { id: parseInt(id) },
            include: { club: true },
        });
        if (!quiz || quiz.clubId !== clubId) {
            logger_1.default.warn(`Unauthorized access to quiz results for quiz ID: ${id} by ClubID: ${clubId}`);
            return res.status(403).json({ error: const_1.MESSAGES.QUIZ.ACCESS_DENIED });
        }
        const results = yield database_config_1.prisma.result.findMany({
            where: { quizId: parseInt(id) },
            include: { user: true },
        });
        logger_1.default.info(`Fetched quiz results for quiz ID: ${id}`);
        res.json(results);
    }
    catch (error) {
        logger_1.default.error(`${const_1.MESSAGES.QUIZ.ERROR_FETCHING_QUIZ_RESULTS}: ${error}`);
        res.status(500).json({ error: const_1.MESSAGES.QUIZ.ERROR_FETCHING_QUIZ_RESULTS });
    }
});
exports.getQuizResults = getQuizResults;