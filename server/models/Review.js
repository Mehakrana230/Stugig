const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    communication: {
      type: Number,
      required: [true, 'Communication rating is required'],
      min: [1, 'Communication rating must be at least 1'],
      max: [5, 'Communication rating cannot exceed 5'],
    },
    quality: {
      type: Number,
      required: [true, 'Quality rating is required'],
      min: [1, 'Quality rating must be at least 1'],
      max: [5, 'Quality rating cannot exceed 5'],
    },
    timeliness: {
      type: Number,
      required: [true, 'Timeliness rating is required'],
      min: [1, 'Timeliness rating must be at least 1'],
      max: [5, 'Timeliness rating cannot exceed 5'],
    },
    comment: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Comment cannot exceed 500 characters'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Review', ReviewSchema);
