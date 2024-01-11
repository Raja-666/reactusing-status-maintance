const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Kyc = require("../models/KycSchema");
const profileModel = require("../models/Profileschema");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "rajahulk@gmail.com",
    pass: "tqyohoarfeabqlnt",
  },
});

const handleGetKyc = async (req, res) => {
  try {
    let KycData = await Kyc.aggregate([
      {
        $match: {},
      },
      {
        $addFields: {
          completedStatus: {
            $cond: [
              {
                $and: [
                  { $eq: ["$frontStatus", true] },
                  { $eq: ["$backStatus", true] },
                  { $eq: ["$selfiStatus", true] },
                ],
              },
              true,
              false,
            ],
          },
        },
      },
    ]);

    return res
      .status(200)
      .json({ success: true, data: KycData, message: "Successfully get!!" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, data: [], message: "Internal server error" });
  }
};

const handleUpdateKyc = async (req, res) => {
  try {
    const reqData = req.body; // type || flag
    console.table(reqData);

    let updateQ, msg;

    if (reqData.flag === 0) {
      let fieldName = reqData.type.split("Reason").at(0);
      let tag = fieldName + "Status";
      let fImage = {
        back: "backSideProof",
        front: "frontSideProof",
        selfi: "selfieProof",
      };
      let img = fImage[fieldName];
      updateQ = {
        [reqData.type]: reqData.reason,
        [tag]: false,
        [img]: "", // Set only the rejected image to an empty string
      };
      msg = "Rejected";
    } else {
      let d = reqData.type.split("Status").at(0) + "Reason";
      updateQ = { [reqData.type]: true, [d]: "" };
      msg = "Approved";
    }

    await Kyc.findOneAndUpdate({ _id: reqData._id }, updateQ);
    msg = reqData.type + (reqData.flag === 0 ? " Rejected" : " Approved");

    // Check if all three images' statuses are true
    const {
      frontStatus,
      backStatus,
      selfiStatus,
      frontReason,
      backReason,
      selfiReason,
    } = await Kyc.findOne({ _id: reqData._id });
   
    const mailOptions = {
      from: "rajahulk@gmail.com",
      to: "rajahulk@gmail.com", 
      subject: "KYC Status Update",
      text: `Your KYC has been ${msg}.`,
    };

    if (frontStatus && backStatus && selfiStatus) {
      maiToHandle(mailOptions);
    } else if (frontReason && backReason && selfiReason) {
      maiToHandle(mailOptions);
    }

    res.status(200).json({ success: true, message: msg });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Err-" + error.message });
  }
};

function maiToHandle(mailOptions) {
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
      return false;
    } else {
      console.log("Email sent:", info.response);
      return true;
    }
  });
}

// OLD
const handleUpdateKyc_old = async (req, res) => {
  try {
    const reqData = req.body;
    /**
     * _id : Id
     * status : 1 -> apprv
     * status : 2 -> reject
     */

    await Kyc.findOneAndUpdate(
      { _id: reqData._id },
      { status: reqData.status }
    );
    msg = "Kyc Verified";
    if (reqData.status == 2) {
      msg = "Kyc Rejected";
    }
    res.status(200).json({ success: true, message: msg });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Err-" + error.message });
  }
};

const handleKycStatus = async (req, res) => {
  try {
    const { _id, frontStatus, backStatus, selfiStatus } = req.body;

    if (frontStatus && backStatus && selfiStatus) {
      // Update KYC status to Approved
      await UserKyc.findByIdAndUpdate(_id, { status: "Approved" });
      return res.json({
        success: true,
        message: "KYC status updated to Approved",
      });
    } else {
      // Handle other cases if needed
      return res.json({
        success: false,
        message: "Conditions not met for approval",
      });
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

module.exports = { handleGetKyc, handleUpdateKyc, handleKycStatus };
