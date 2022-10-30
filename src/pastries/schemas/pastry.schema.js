"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.PastrySchema = exports.Pastry = void 0;
var mongoose_1 = require("@nestjs/mongoose");
var Pastry = /** @class */ (function () {
    function Pastry() {
    }
    __decorate([
        (0, mongoose_1.Prop)({ type: String, required: true })
    ], Pastry.prototype, "name");
    __decorate([
        (0, mongoose_1.Prop)({ type: Number, required: true })
    ], Pastry.prototype, "price");
    __decorate([
        (0, mongoose_1.Prop)({ type: String, required: true })
    ], Pastry.prototype, "description");
    __decorate([
        (0, mongoose_1.Prop)({ type: String, required: true })
    ], Pastry.prototype, "imageLink");
    __decorate([
        (0, mongoose_1.Prop)({ type: [String] })
    ], Pastry.prototype, "ingredients");
    __decorate([
        (0, mongoose_1.Prop)({ type: Number })
    ], Pastry.prototype, "stock");
    __decorate([
        (0, mongoose_1.Prop)({ type: Boolean, "default": false })
    ], Pastry.prototype, "hidden");
    __decorate([
        (0, mongoose_1.Prop)({ type: String })
    ], Pastry.prototype, "commonStock");
    Pastry = __decorate([
        (0, mongoose_1.Schema)()
    ], Pastry);
    return Pastry;
}());
exports.Pastry = Pastry;
exports.PastrySchema = mongoose_1.SchemaFactory.createForClass(Pastry);
