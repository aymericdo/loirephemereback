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
exports.__esModule = true;
exports.AppGateway = void 0;
var websockets_1 = require("@nestjs/websockets");
var common_1 = require("@nestjs/common");
var webpush = require("web-push");
var AppGateway = /** @class */ (function () {
    function AppGateway() {
        this.users = [];
        this.waitingQueue = [];
        this.waitingQueueSubNotification = [];
        this.waitingAdminSubNotification = [];
        this.admins = [];
        this.logger = new common_1.Logger('AppGateway');
    }
    AppGateway.prototype.handleDisconnect = function (client) {
        this.logger.log("Client disconnected");
        client.send(JSON.stringify({ bye: 'au revoir' }));
    };
    AppGateway.prototype.handleConnection = function (client) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        this.logger.log("Client connected");
        client.send(JSON.stringify({ hello: 'bonjour' }));
        this.users.push(client);
    };
    AppGateway.prototype.alertNewCommand = function (command) {
        var _this = this;
        this.admins.forEach(function (client) {
            return client.send(JSON.stringify({ addCommand: command }));
        });
        this.waitingAdminSubNotification.forEach(function (adminSub) {
            _this.sendPushNotif(adminSub.sub, 'Une nouvelle commande est arrivée !', command);
        });
    };
    AppGateway.prototype.alertCloseCommand = function (command) {
        this.admins.forEach(function (client) {
            return client.send(JSON.stringify({ closeCommand: command }));
        });
    };
    AppGateway.prototype.alertPayedCommand = function (command) {
        this.admins.forEach(function (client) {
            return client.send(JSON.stringify({ payedCommand: command }));
        });
    };
    AppGateway.prototype.stockChanged = function (newStock) {
        this.users.forEach(function (client) {
            return client.send(JSON.stringify({ stockChanged: newStock }));
        });
    };
    AppGateway.prototype.addWaitingQueueSubNotification = function (subNotif) {
        this.waitingQueueSubNotification.push({
            commandId: subNotif.commandId,
            sub: subNotif.sub
        });
    };
    AppGateway.prototype.addAdminQueueSubNotification = function (subNotif) {
        if (!this.waitingAdminSubNotification.some(function (notif) { return notif.sub.endpoint === subNotif.sub.endpoint; })) {
            this.waitingAdminSubNotification.push({
                sub: subNotif.sub
            });
        }
    };
    AppGateway.prototype.onWizzer = function (data, client) {
        var _a, _b;
        var ws = (_a = this.waitingQueue.find(function (user) { return user.commandId === data._id; })) === null || _a === void 0 ? void 0 : _a.ws;
        var subNotification = (_b = this.waitingQueueSubNotification.find(function (subNotif) { return subNotif.commandId === data._id; })) === null || _b === void 0 ? void 0 : _b.sub;
        if (subNotification) {
            this.sendPushNotif(subNotification, 'Votre commande est prête !', data);
        }
        if (ws) {
            ws.send(JSON.stringify({ wizz: data._id }));
        }
    };
    AppGateway.prototype.onAddWaitingQueue = function (data, client) {
        this.waitingQueue.push({ commandId: data._id, ws: client });
    };
    AppGateway.prototype.onAuthorization = function (data, client) {
        if (data === process.env.PASSWORD) {
            this.admins.push(client);
        }
    };
    AppGateway.prototype.sendPushNotif = function (sub, body, _command) {
        var payload = JSON.stringify({
            notification: {
                title: 'Petite notif gentille',
                body: body,
                icon: 'assets/icons/icon-128x128.png',
                vibrate: [
                    500,
                    110,
                    500,
                    110,
                    450,
                    110,
                    200,
                    110,
                    170,
                    40,
                    450,
                    110,
                    200,
                    110,
                    170,
                    40,
                    500,
                ],
                data: {
                    dateOfArrival: Date.now(),
                    primaryKey: 1
                }
            }
        });
        webpush
            .sendNotification(sub, payload)
            .then(function () {
            console.log('notif sent');
        })["catch"](function (err) { return console.error(err); });
    };
    __decorate([
        (0, websockets_1.WebSocketServer)()
    ], AppGateway.prototype, "server");
    __decorate([
        (0, websockets_1.SubscribeMessage)('wizzer'),
        __param(0, (0, websockets_1.MessageBody)()),
        __param(1, (0, websockets_1.ConnectedSocket)())
    ], AppGateway.prototype, "onWizzer");
    __decorate([
        (0, websockets_1.SubscribeMessage)('addWaitingQueue'),
        __param(0, (0, websockets_1.MessageBody)()),
        __param(1, (0, websockets_1.ConnectedSocket)())
    ], AppGateway.prototype, "onAddWaitingQueue");
    __decorate([
        (0, websockets_1.SubscribeMessage)('authorization'),
        __param(0, (0, websockets_1.MessageBody)()),
        __param(1, (0, websockets_1.ConnectedSocket)())
    ], AppGateway.prototype, "onAuthorization");
    AppGateway = __decorate([
        (0, websockets_1.WebSocketGateway)()
    ], AppGateway);
    return AppGateway;
}());
exports.AppGateway = AppGateway;
