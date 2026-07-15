const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [1, 'Amount must be at least 1'],
    },
    commission: {
      type: Number,
      default: 0,
    },
    netAmount: {
      type: Number,
      default: 0,
    },
    stripePaymentIntentId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['escrowed', 'released', 'refunded'],
      default: 'escrowed',
    },
  },
  { timestamps: true }
);

// Pre-save hook to calculate 15% commission and 85% netAmount
PaymentSchema.pre('save', function (next) {
  if (this.amount) {
    this.commission = Number((this.amount * 0.15).toFixed(2));
    this.netAmount = Number((this.amount * 0.85).toFixed(2));
  }
  next();
});

module.exports = mongoose.model('Payment', PaymentSchema);
