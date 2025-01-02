"use client";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableRow, Button, Input, Dialog, DialogContent, DialogTitle } from "@mui/material";
import { Trash2, Edit, Plus } from "lucide-react";
import { SQL, inArray, sql } from 'drizzle-orm';
//import { users } from './schema';



export function SensorManagement() {
    const [sensors, setSensors] = useState(initialSensors);
    const [editingSensor, setEditingSensor] = useState<any>(null);
    const [open, setOpen] = useState(false);
    const [newSensor, setNewSensor] = useState({
        name: "",
        familyId: "",
        productId: "",
        decoder: "",
    });
    const initialSensors = [
        { id: 1, name: "smc30", familyId: 1, productId: 0, prperties: "",decoder: "a" },
        { id: 2, name: "smc31", familyId: 1, productId: 1, decoder: "b" },
        { id: 3, name: "smc32", familyId: 2, productId: 0, decoder: "c" },
    ];
    

    // Add a new sensor
    const addSensor = () => {
        if (newSensor.name && newSensor.familyId && newSensor.productId && newSensor.decoder) {
            await db.insert(users).values({ name: 'Andrew' });
        }
    };

    // Update an existing sensor
    const updateSensor = (updatedSensor: any) => {
        update users set "city" = 
        (case when id = 1 then 'New York' when id = 2 then 'Los Angeles' when id = 3 then 'Chicago' end)
      where id in (1, 2, 3)
    };

    // Delete a sensor by ID
    const deleteSensor = (id: number) => {
        await db.delete(users).where(eq(users.name, 'Dan'));
    };

    return (
        <div className="p-6 bg-gray-50 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-6">Sensor Management</h2>

            {/* Add Sensor Dialog */}
            <Button onClick={() => setOpen(true)} variant="contained" startIcon={<Plus />}>
                Add New Sensor
            </Button>

            <Dialog open={open} onClose={() => setOpen(false)}>
                <DialogTitle>Add New Sensor</DialogTitle>
                <DialogContent>
                    <div className="flex flex-col space-y-4 py-4">
                        <div className="flex items-center space-x-4">
                            <label className="w-24 text-right text-sm">Name</label>
                            <Input
                                value={newSensor.name}
                                onChange={(e) => setNewSensor({ ...newSensor, name: e.target.value })}
                                className="flex-1"
                            />
                        </div>
                        <div className="flex items-center space-x-4">
                            <label className="w-24 text-right text-sm">Family ID</label>
                            <Input
                                value={newSensor.familyId}
                                onChange={(e) => setNewSensor({ ...newSensor, familyId: e.target.value })}
                                className="flex-1"
                            />
                        </div>
                        <div className="flex items-center space-x-4">
                            <label className="w-24 text-right text-sm">Product ID</label>
                            <Input
                                value={newSensor.productId}
                                onChange={(e) => setNewSensor({ ...newSensor, productId: e.target.value })}
                                className="flex-1"
                            />
                        </div>
                        <div className="flex items-center space-x-4">
                            <label className="w-24 text-right text-sm">Decoder</label>
                            <Input
                                value={newSensor.decoder}
                                onChange={(e) => setNewSensor({ ...newSensor, decoder: e.target.value })}
                                className="flex-1"
                            />
                        </div>
                    </div>
                    <Button fullWidth onClick={addSensor}>
                        Add Sensor
                    </Button>
                </DialogContent>
            </Dialog>

            
            <Table>
                <TableHead>
                    <TableRow>
                        {["Name", "Family ID", "Product ID", "Decoder", "Actions"].map((header) => (
                            <TableCell key={header}>{header}</TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {sensors.map((sensor) => (
                        <TableRow key={sensor.id}>
                            <TableCell>{sensor.name}</TableCell>
                            <TableCell>{sensor.familyId}</TableCell>
                            <TableCell>{sensor.productId}</TableCell>
                            <TableCell>{sensor.decoder}</TableCell>
                            <TableCell>
                                {/* Edit Sensor Dialog */}
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => setEditingSensor(sensor)}
                                    className="mr-2"
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>

                                {/* Edit Dialog */}
                                <Dialog open={!!editingSensor} onClose={() => setEditingSensor(null)}>
                                    <DialogTitle>Edit Sensor</DialogTitle>
                                    <DialogContent>
                                        {editingSensor && (
                                            <div className="grid gap-4 py-4">
                                                {["name", "familyId", "productId", "decoder"].map((field) => (
                                                    <div key={field} className="grid grid-cols-4 items-center gap-4">
                                                        <label className="text-right capitalize">{field}</label>
                                                        <Input
                                                            value={editingSensor[field]}
                                                            onChange={(e) =>
                                                                setEditingSensor({ ...editingSensor, [field]: e.target.value })
                                                            }
                                                            className="col-span-3"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <Button onClick={() => updateSensor(editingSensor)} fullWidth>
                                            Update Sensor
                                        </Button>
                                    </DialogContent>
                                </Dialog>

                                {/* Delete Sensor Button */}
                                <Button
                                    variant="outlined"
                                    size="small"
                                    color="error"
                                    onClick={() => deleteSensor(sensor.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
