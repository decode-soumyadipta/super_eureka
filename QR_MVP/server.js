const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/add-data', (req, res) => {
    const { wasteType, sourceLocation, generatedDate, weightKg, recyclable, disposalMethod, costPerKg, disposalStatus } = req.body;
    const newData = `${wasteType},${sourceLocation},${generatedDate},${weightKg},${recyclable},${disposalMethod},${costPerKg},${disposalStatus}\n`;

    fs.appendFile('Gdata.csv', newData, (err) => {
        if (err) {
            console.error('Error writing to file', err);
            res.status(500).send('Internal Server Error');
        } else {
            res.send('Data added successfully');
        }
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});