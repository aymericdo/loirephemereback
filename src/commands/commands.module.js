"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.CommandsModule = void 0;
var common_1 = require("@nestjs/common");
var mongoose_1 = require("@nestjs/mongoose");
var pastries_module_1 = require("../pastries/pastries.module");
var shared_module_1 = require("../shared/shared.module");
var commands_controller_1 = require("./commands.controller");
var commands_service_1 = require("./commands.service");
var command_schema_1 = require("./schemas/command.schema");
var CommandsModule = /** @class */ (function () {
    function CommandsModule() {
    }
    CommandsModule = __decorate([
        (0, common_1.Module)({
            imports: [
                shared_module_1.SharedModule,
                pastries_module_1.PastriesModule,
                mongoose_1.MongooseModule.forFeature([{ name: command_schema_1.Command.name, schema: command_schema_1.CommandSchema }]),
            ],
            controllers: [commands_controller_1.CommandsController],
            providers: [commands_service_1.CommandsService]
        })
    ], CommandsModule);
    return CommandsModule;
}());
exports.CommandsModule = CommandsModule;
