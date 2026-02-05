import runDaily from "./gsc-daily.mjs";

export const handler = async () => {
  try {
    await runDaily();
    return { statusCode: 200, body: "OK" };
  } catch (err) {
    return {
      statusCode: 500,
      body: err?.stack || String(err)
    };
  }
};
