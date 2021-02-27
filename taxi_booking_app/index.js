const fs = require("fs");

let cabData = JSON.parse(fs.readFileSync("./cabs.json"));

const cabs = ["taxi_1","taxi_2","taxi_3","taxi_4"];

const destinationPoints = ["A","B","C","D","E","F"];

const dstBwtPoints = 15;

const timeTaken = 1;

const calculateEarnings = (pick_up,drop,pickup_time) => {
    const points = Math.abs((destinationPoints.findIndex(point => point === pick_up) + 1) - (destinationPoints.findIndex(point => point === drop) + 1));
    const totalKms =  points * dstBwtPoints;
    const totalEarnings = 100 + ((totalKms - 5) * 10);
    const timetoReach = (points * timeTaken) + pickup_time;
    return { totalKms, totalEarnings, timetoReach };
}

const getAvailableCab = (pick_up,pickup_time) => {
    const cabAtPickUp = Object.values(cabData).filter(cab =>  cab.current_point === pick_up);
    const availableCab = cabAtPickUp.filter(cab => {
        if(cab.history.length)
            return cab.history[cab.history.length - 1].timetoReach < pickup_time;
        return cab;
    })
    return availableCab;
}

const getNearestAvailableCabs = (nearest_point,pickup_time,action) => {
    const cabsAtNearestPoint  = getAvailableCab(nearest_point,pickup_time);
    if(cabsAtNearestPoint.length){
        return { nearest_point, cabs: cabsAtNearestPoint };
    }else{
        const point_index = destinationPoints.findIndex(point => point === nearest_point);
        action === "backward" 
                ? point_index !== 0
                    ? getNearestAvailableCabs(destinationPoints[point_index -1],pickup_time,action)
                    : []
                : point_index !== destinationPoints.length - 1
                    ? getNearestAvailableCabs(destinationPoints[point_index + 1],pickup_time,action)
                    : []
    }

}

const updateCabData = (cabsAtPickUpPoint,booking_data) => {
    const {
        customer_id,
        pick_up,
        drop,
        pickup_time
    } = booking_data;

    const cabForRide = cabsAtPickUpPoint.reduce((finalCab,cab) => {
        if(Object.keys(finalCab).length)
            return finalCab.total_earnings > cab.total_earnings ? cab : finalCab;
        return cab;
    },{});

    const calculatedData = calculateEarnings(pick_up,drop,pickup_time);

    cabForRide.total_earnings += calculatedData.totalEarnings;

    cabForRide.history.push({
        customer_id,
        pick_up,
        drop,
        pickup_time,
        ...calculatedData
    });

    cabForRide.current_point = drop;

    return cabForRide;
}

const createInitialCabRecord = () => {
    const cabRecord = {};
    for(const cab of cabs){
        cabRecord[cab] = {
            name: cab,
            current_point: "A",
            total_earnings: 0,
            history: []
        }
    }
    fs.writeFileSync("./cabs.json",JSON.stringify(cabRecord));
    cabData = JSON.parse(fs.readFileSync("./cabs.json"));
}

!Object.keys(cabData).length && createInitialCabRecord();

const getNearestCabsList = (availableCabsData,pick_up) => {
    if(!availableCabsData.length){
        return null;
    }else{
        const leastDistanceList = availableCabsData.map(data => Math.abs((destinationPoints.findIndex(point => point === data.nearest_point) + 1) -  (destinationPoints.findIndex(point => point === pick_up) + 1)));
        const finalData = leastDistanceList.reduce((cabsList,dist,index) => {
            if(!cabsList.cabs.length || cabsList.point < dist)
                return { point: dist, cabs: availableCabsData[index].cabs };
            return cabsList;
        },{point: null,cabs:[]});
        return finalData.cabs;
    }
}

const bookCab = booking_data => {
    const {
        pick_up,
        pickup_time
    } = booking_data;

    const cabsAtPickUpPoint = getAvailableCab(pick_up,pickup_time);
     
    if(cabsAtPickUpPoint.length){
        const cabForRide = updateCabData(cabsAtPickUpPoint,booking_data);

        cabData[cabForRide.name] = cabForRide;
    }else{
        const availableCabsData = [];
        const point_index = destinationPoints.findIndex(point => point === pick_up);
        if(point_index !== 0) {
            const data = getNearestAvailableCabs(destinationPoints[point_index - 1],pickup_time,"backward");
            data && availableCabsData.push(data);
        }

        if(point_index !== destinationPoints.length - 1) {
            const data = getNearestAvailableCabs(destinationPoints[point_index + 1],pickup_time,"forward");
            data && availableCabsData.push(data);
        }

        const cabsList = getNearestCabsList(availableCabsData,pick_up);
        if(!cabsList || !cabsList.length){
            console.log("Booking Rejected - No cabs Available");
            return;
        }

        const cabForRide = updateCabData(cabsList,booking_data);

        cabData[cabForRide.name] = cabForRide;
    }
    fs.writeFileSync("./cabs.json",JSON.stringify(cabData));
    console.log("Successfully booked");
    console.log(JSON.stringify(cabData));
}

const inputs = [
    {
        customer_id: 1,
        pick_up: "A",
        drop: "B",
        pickup_time: 9   
    },
    {
        customer_id: 2,
        pick_up: "B",
        drop: "D",
        pickup_time: 9  
    },
    {
        customer_id: 3,
        pick_up: "B",
        drop: "C",
        pickup_time: 12   
    }
];

inputs.forEach(bookCab);
