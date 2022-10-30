"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.CommandsController = void 0;
var common_1 = require("@nestjs/common");
var auth_guard_1 = require("./auth.guard");
var mongoose_1 = require("@nestjs/mongoose");
var CommandsController = /** @class */ (function () {
    function CommandsController(pastriesService, commandsService, appGateway, connection) {
        this.pastriesService = pastriesService;
        this.commandsService = commandsService;
        this.appGateway = appGateway;
        this.connection = connection;
    }
    CommandsController.prototype.getAll = function (res, query) {
        return __awaiter(this, void 0, void 0, function () {
            var commands;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.commandsService.findAll(query.year)];
                    case 1:
                        commands = _a.sent();
                        return [2 /*return*/, res.status(common_1.HttpStatus.OK).json(commands)];
                }
            });
        });
    };
    CommandsController.prototype.patchCommand = function (id, res) {
        return __awaiter(this, void 0, void 0, function () {
            var command;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.commandsService.closeCommand(id)];
                    case 1:
                        command = _a.sent();
                        this.appGateway.alertCloseCommand(command);
                        return [2 /*return*/, res.status(common_1.HttpStatus.OK).json(command)];
                }
            });
        });
    };
    CommandsController.prototype.patchCommand2 = function (id, res) {
        return __awaiter(this, void 0, void 0, function () {
            var command;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.commandsService.payedCommand(id)];
                    case 1:
                        command = _a.sent();
                        this.appGateway.alertPayedCommand(command);
                        return [2 /*return*/, res.status(common_1.HttpStatus.OK).json(command)];
                }
            });
        });
    };
    CommandsController.prototype.postCommand = function (res, createCatDto) {
        return __awaiter(this, void 0, void 0, function () {
            var pastriesGroupBy, transactionSession, pastriesToZero, command, err_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        pastriesGroupBy = createCatDto.pastries.reduce(function (prev, pastry) {
                            if (pastry.stock === undefined || pastry.stock === null) {
                                return prev;
                            }
                            if (!prev.hasOwnProperty(pastry._id)) {
                                prev[pastry._id] = 1;
                            }
                            else {
                                prev[pastry._id] = prev[pastry._id] + 1;
                            }
                            return prev;
                        }, {});
                        return [4 /*yield*/, this.connection.startSession()];
                    case 1:
                        transactionSession = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 5, 6, 7]);
                        transactionSession.startTransaction();
                        return [4 /*yield*/, Object.keys(pastriesGroupBy).reduce(function (prev, pastryId) { return __awaiter(_this, void 0, void 0, function () {
                                var oldPastry;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, this.pastriesService.findOne(pastryId)];
                                        case 1:
                                            oldPastry = _a.sent();
                                            if (oldPastry.stock - pastriesGroupBy[pastryId] < 0) {
                                                prev.push(oldPastry);
                                            }
                                            return [2 /*return*/, prev];
                                    }
                                });
                            }); }, [])];
                    case 3:
                        pastriesToZero = _a.sent();
                        if (pastriesToZero.length) {
                            return [2 /*return*/, res
                                    .status(common_1.HttpStatus.UNPROCESSABLE_ENTITY)
                                    .json({ outOfStock: pastriesToZero })];
                        }
                        return [4 /*yield*/, this.commandsService.create(createCatDto)];
                    case 4:
                        command = _a.sent();
                        this.appGateway.alertNewCommand(command);
                        Object.keys(pastriesGroupBy).forEach(function (pastryId) { return __awaiter(_this, void 0, void 0, function () {
                            var oldPastry, oldPastries, pastry;
                            var _this = this;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, this.pastriesService.findOne(pastryId)];
                                    case 1:
                                        oldPastry = _a.sent();
                                        if (!oldPastry.commonStock) return [3 /*break*/, 3];
                                        return [4 /*yield*/, this.pastriesService.findByCommonStock(oldPastry.commonStock)];
                                    case 2:
                                        oldPastries = _a.sent();
                                        oldPastries.forEach(function (oldP) { return __awaiter(_this, void 0, void 0, function () {
                                            var newP;
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0: return [4 /*yield*/, this.pastriesService.decrementStock(oldP, pastriesGroupBy[oldPastry._id])];
                                                    case 1:
                                                        newP = _a.sent();
                                                        this.appGateway.stockChanged({
                                                            pastryId: oldP._id,
                                                            newStock: newP.stock
                                                        });
                                                        return [2 /*return*/];
                                                }
                                            });
                                        }); });
                                        return [3 /*break*/, 5];
                                    case 3: return [4 /*yield*/, this.pastriesService.decrementStock(oldPastry, pastriesGroupBy[oldPastry._id])];
                                    case 4:
                                        pastry = _a.sent();
                                        this.appGateway.stockChanged({
                                            pastryId: oldPastry._id,
                                            newStock: pastry.stock
                                        });
                                        _a.label = 5;
                                    case 5: return [2 /*return*/];
                                }
                            });
                        }); });
                        transactionSession.commitTransaction();
                        return [2 /*return*/, res.status(common_1.HttpStatus.OK).json(command)];
                    case 5:
                        err_1 = _a.sent();
                        transactionSession.abortTransaction();
                        return [3 /*break*/, 7];
                    case 6:
                        transactionSession.endSession();
                        return [7 /*endfinally*/];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    CommandsController.prototype.postNotificationSub = function (res, body) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.appGateway.addAdminQueueSubNotification(body);
                res.status(common_1.HttpStatus.OK).json();
                return [2 /*return*/];
            });
        });
    };
    __decorate([
        (0, common_1.Get)(),
        (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
        __param(0, (0, common_1.Res)()),
        __param(1, (0, common_1.Query)())
    ], CommandsController.prototype, "getAll");
    __decorate([
        (0, common_1.Patch)('/close/:id'),
        __param(0, (0, common_1.Param)('id')),
        __param(1, (0, common_1.Res)())
    ], CommandsController.prototype, "patchCommand");
    __decorate([
        (0, common_1.Patch)('/payed/:id'),
        __param(0, (0, common_1.Param)('id')),
        __param(1, (0, common_1.Res)())
    ], CommandsController.prototype, "patchCommand2");
    __decorate([
        (0, common_1.Post)(),
        __param(0, (0, common_1.Res)()),
        __param(1, (0, common_1.Body)())
    ], CommandsController.prototype, "postCommand");
    __decorate([
        (0, common_1.Post)('notification'),
        __param(0, (0, common_1.Res)()),
        __param(1, (0, common_1.Body)())
    ], CommandsController.prototype, "postNotificationSub");
    CommandsController = __decorate([
        (0, common_1.Controller)('commands'),
        __param(3, (0, mongoose_1.InjectConnection)())
    ], CommandsController);
    return CommandsController;
}());
exports.CommandsController = CommandsController;
