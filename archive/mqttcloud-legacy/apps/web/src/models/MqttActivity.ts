import mongoose, { Document, Model, Schema, Types } from "mongoose";

// Connect/disconnect audit log, written by the standalone broker service.
// Auto-expires after 30 days via the TTL index below to keep the collection light.
export interface IMqttActivity extends Document {
  userId: Types.ObjectId;
  mqttUserId: Types.ObjectId;
  clientName: string;
  event: "connect" | "disconnect";
  createdAt: Date;
}

const MqttActivitySchema = new Schema<IMqttActivity>(
  {
    userId:     { type: Schema.Types.ObjectId, ref: "User",     required: true, index: true },
    mqttUserId: { type: Schema.Types.ObjectId, ref: "MqttUser", required: true, index: true },
    clientName: { type: String, required: true },
    event:      { type: String, enum: ["connect", "disconnect"], required: true },
    createdAt:  { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 },
  },
  { timestamps: false }
);

delete mongoose.models["MqttActivity"];
const MqttActivity: Model<IMqttActivity> = mongoose.model<IMqttActivity>("MqttActivity", MqttActivitySchema);

export default MqttActivity;
