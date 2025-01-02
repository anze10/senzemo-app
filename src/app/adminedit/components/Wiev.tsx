"use client";

import { Checkbox, Button, InputLabel, Input, FormControl, MenuItem, Select } from "@mui/material";
import { useState } from 'react';
import React from 'react';
import { useRouter } from "next/navigation";
import axios from 'axios';

export default function Component() {
    const router = useRouter();
    const [deviceType, setDeviceType] = useState('');
    const [dataRate, setDataRate] = useState<number>(0);
    const [frequencyRegion, setFrequencyRegion] = useState('');
    const [hybridEnable, setHybridEnable] = useState<string[]>([]);
    const [hybridMask, setHybridMask] = useState<string[]>([]);
    const [sendPeriod, setSendPeriod] = useState('');
    const [ack, setAck] = useState('');
    const [movThr, setMovThr] = useState('');
    const [adcDelay, setAdcDelay] = useState('');
    const [adcEnable, setAdcEnable] = useState(false);

    const handleSubmit = async (action: string) => {
        try {
            await axios.post('/api/device', {
                action,
                data: {
                    dev_id: 0, // Add appropriate value or handle auto-increment in DB
                    user_id: 1, // Replace with actual user_id or handle accordingly
                    dev_eui: '',
                    family_id: null,
                    product_id: null,
                    temperature: null,
                    humidity: null,
                    join_eui: '',
                    app_key: '',
                    lora_ack: null,
                    lora_send_period: null,
                    lora_dr_adr_en: null,
                    lora_freq_reg: '',
                    lora_hyb_asoff_mask0_1: null,
                    lora_mask2_5: null,
                    device_adc_delay: null,
                    device_adc_en: adcEnable ? 1 : 0,
                    device_fw_ver: null,
                    device_hw_ver: null,
                    device_mov_thr: movThr,
                    device_status: null
                }
            });
            router.push('/success'); // Adjust according to your routing
        } catch (error) {
            console.error("Error:", error);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <h1 className="text-3xl font-bold mb-8">SENZEMO</h1>
            <div className="w-full max-w-5xl">
                <h2 className="text-center text-xl font-semibold mb-4">CONFIG</h2>
                <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-1">
                        <InputLabel htmlFor="app-eui">APP EUI</InputLabel>
                        <Input id="app-eui" placeholder="(ENTER VALUE)" fullWidth />
                        <p className="text-sm text-muted-foreground">optional</p>
                    </div>
                    <div className="col-span-1">
                        <InputLabel htmlFor="app-eui">APP EUI</InputLabel>
                        <Input id="app-eui" placeholder="(ENTER VALUE)" fullWidth />
                        <p className="text-sm text-muted-foreground">optional</p>
                    </div>
                    <div className="col-span-1">
                        <InputLabel htmlFor="app-key">APP KEY</InputLabel>
                        <Input id="app-key" placeholder="(ENTER VALUE)" fullWidth />
                        <p className="text-sm text-muted-foreground">optional</p>
                    </div>
                    <div className="col-span-1">
                        <InputLabel htmlFor="app-eui">APP EUI</InputLabel>
                        <Input id="app-eui" placeholder="(ENTER VALUE)" fullWidth />
                        <p className="text-sm text-muted-foreground">optional</p>
                    </div>
                    <div className="col-span-1">
                        <InputLabel htmlFor="app-eui">APP EUI</InputLabel>
                        <Input id="app-eui" placeholder="(ENTER VALUE)" fullWidth />
                        <p className="text-sm text-muted-foreground">optional</p>
                    </div>
                    <div className="col-span-1">
                        <FormControl fullWidth>
                            <InputLabel htmlFor="frequency-region">FREQUENCY REGION</InputLabel>
                            <Select
                                id="frequency-region"
                                value={frequencyRegion}
                                onChange={(e) => setFrequencyRegion(e.target.value)}
                                label="FREQUENCY REGION"
                            >
                                <MenuItem value="eu">EU</MenuItem>
                                <MenuItem value="us">US</MenuItem>
                            </Select>
                        </FormControl>
                        <p className="text-sm text-muted-foreground">optional EU, US,...</p>
                    </div>
                    <div className="col-span-1">
                        <InputLabel htmlFor="app-eui">APP EUI</InputLabel>
                        <Input id="app-eui" placeholder="(ENTER VALUE)" fullWidth />
                        <p className="text-sm text-muted-foreground">optional</p>
                    </div>
                    <div className="col-span-1">
                        <FormControl fullWidth>
                            <InputLabel htmlFor="hybrid-mask">HYBRID MASK 2-5</InputLabel>
                            <Select
                                id="hybrid-mask"
                                value={hybridMask}
                                onChange={(e) => setHybridMask(e.target.value as string[])}
                                label="HYBRID MASK 2-5"
                            >
                                <MenuItem value="mask1">Mask 1</MenuItem>
                                <MenuItem value="mask2">Mask 2</MenuItem>
                            </Select>
                        </FormControl>
                    </div>
                    <div className="col-span-1">
                        <InputLabel htmlFor="send-period">SEND PERIOD</InputLabel>
                        <Input id="send-period" placeholder="(ENTER VALUE)" fullWidth />
                    </div>
                    <div className="col-span-1">
                        <InputLabel htmlFor="ack">ACK</InputLabel>
                        <Input id="ack" placeholder="(ENTER VALUE)" fullWidth />
                    </div>
                    <div className="col-span-1">
                        <InputLabel htmlFor="mov-thr">MOV THR</InputLabel>
                        <Input id="mov-thr" placeholder="(ENTER VALUE)" fullWidth />
                    </div>
                    <div className="col-span-1">
                        <InputLabel htmlFor="adc-enable">ADC ENABLE</InputLabel>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="adc-enable" />
                            <label
                                htmlFor="adc-enable"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                [DEVICE SPECIFIC] SMISLENO OMOGOČITI GLEDE NA TIP
                            </label>
                        </div>
                    </div>
                    <div className="col-span-1">
                        <InputLabel htmlFor="adc-delay">ADC delay</InputLabel>
                        <Input id="adc-delay" placeholder="(ENTER VALUE)" fullWidth />
                    </div>
                    <div className="col-span-4 flex justify-center mt-4">
                        <Button onClick={() => handleSubmit('add')}>ADD NEW SENSOR</Button>
                        <Button onClick={() => handleSubmit('delete')}>DELETE OLD SENSOR</Button>
                        <Button onClick={() => handleSubmit('modify')}>MODIFY SENSOR</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
