// "use server"

// import { prisma } from "./prisma"
// import { Senzor } from "./Senzorji";

// export function ProcessOrder() {
//     return prisma.productionList.create({
//         data: {
//             DeviceType: 'Ime stranke: Janez Novak, Številka naročila: 12345, Datum: 2023-01-28',
//             order: 'Naročilo: 12345',
//         }
//     });
// }

// export function InsertArrayofSensors(sezors: Senzor[], defaultData: deafultData[]) {
//     for (let i = 0; i < sezors.length; i++) {
//         sezors[i].id = i + 1;
//         return prisma.senzor.create({
//             data: {
//                 DeviceType: defaultData[i].DeviceType,
//                 DevEUI: sezors[i].DevEUI,
//                 AppEUI: sezors[i].AppEUI,
//                 AppKey: sezors[i].AppKey,
//                 FrequencyRegion: sezors[i].FrequencyRegion,
//                 SubBands: sezors[i].SubBands,
//                 HWVersion: sezors[i].HWVersion,
//                 FWVersion: sezors[i].FWVersion,
//                 CustomFWVersion: sezors[i].CustomFWVersion,
//                 SendPeriod: sezors[i].SendPeriod,
//                 ACK: sezors[i].ACK,
//                 MovementThreshold: sezors[i].MovementThreshold,
//                 orderNumber: sezors[i].orderNumber

//             }
//         });
//     }

// }
