"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.PastriesModule = void 0;
var common_1 = require("@nestjs/common");
var mongoose_1 = require("@nestjs/mongoose");
var shared_module_1 = require("../shared/shared.module");
var pastries_controller_1 = require("./pastries.controller");
var pastries_service_1 = require("./pastries.service");
var pastry_schema_1 = require("./schemas/pastry.schema");
var PastriesModule = /** @class */ (function () {
    function PastriesModule() {
    }
    PastriesModule = __decorate([
        (0, common_1.Module)({
            imports: [
                shared_module_1.SharedModule,
                mongoose_1.MongooseModule.forFeature([{ name: pastry_schema_1.Pastry.name, schema: pastry_schema_1.PastrySchema }]),
            ],
            controllers: [pastries_controller_1.PastriesController],
            providers: [pastries_service_1.PastriesService],
            exports: [pastries_service_1.PastriesService]
        })
    ], PastriesModule);
    return PastriesModule;
}());
exports.PastriesModule = PastriesModule;
