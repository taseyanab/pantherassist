/* Simulated GSU directory for the demo (server side only). Each account has its own random salt for scrypt.
   Production reads identity and roles from GSU SSO and IAM groups instead. */
module.exports = {
  "jblake7": {
    "status": "active",
    "roles": [
      "advisor"
    ],
    "salt": "ce1eed345382b8a3eacf850c38f52e2c"
  },
  "mlee2": {
    "status": "active",
    "roles": [
      "instructor"
    ],
    "salt": "4b29d44f9f3290000894a81fef36bf53"
  },
  "apatel5": {
    "status": "active",
    "roles": [
      "financial_aid_counselor"
    ],
    "salt": "e79ca099ff14d1ec99c80bb39f4fb420"
  },
  "trobinson3": {
    "status": "active",
    "roles": [
      "security_analyst"
    ],
    "salt": "8c1674afe7f2762bea9ccacfa99c99cd"
  },
  "kharris4": {
    "status": "active",
    "roles": [
      "manager"
    ],
    "salt": "21567262fc3505a8e119317b789dce3b"
  },
  "cnguyen1": {
    "status": "active",
    "roles": [
      "staff"
    ],
    "salt": "e5f835a631643233646d9c420c4718e3"
  },
  "rwilliams8": {
    "status": "active",
    "roles": [
      "advisor",
      "instructor"
    ],
    "salt": "d7165d78dffdd475cf3fdc06f98b13df"
  },
  "dbrooks4": {
    "status": "inactive",
    "roles": [
      "staff"
    ],
    "salt": "115b50ae0701b2ee5bdc10ca6e3d328f"
  }
};
