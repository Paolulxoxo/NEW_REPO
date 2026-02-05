import runDaily from "./gsc-daily.mjs";

export const handler = async () => {
  await runDaily();
  return { statusCode: 200, body: "OK" };
};
