import React, { useState, useRef, useEffect } from 'react';
import { Camera, Plus, Car, Calendar, Wrench, Bell, FileText, Edit2, Save, X } from 'lucide-react';

const VehicleMaintenanceTracker = () => {
  // Load data from localStorage or use defaults
  const [garageName, setGarageName] = useState(() => {
    const saved = localStorage.getItem('garageName');
    return saved || 'My Garage';
  });
  const [isEditingGarageName, setIsEditingGarageName] = useState(false);
  const [vehicles, setVehicles] = useState(() => {
    const saved = localStorage.getItem('vehicles');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentView, setCurrentView] = useState('garage'); // garage, addVehicle, vehicleDetail
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraType, setCameraType] = useState(''); // 'vin' or 'odometer'
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('garageName', garageName);
  }, [garageName]);

  useEffect(() => {
    localStorage.setItem('vehicles', JSON.stringify(vehicles));
  }, [vehicles]);
  
  // Add Vehicle Form State
  const [newVehicle, setNewVehicle] = useState({
    vin: '',
    year: '',
    make: '',
    model: '',
    currentMileage: ''
  });

  // Maintenance Form State
  const [maintenanceForm, setMaintenanceForm] = useState({
    mileage: '',
    serviceType: '',
    productUsed: '',
    notes: '',
    reminderDate: '',
    reminderInterval: '3'
  });

  const serviceTypes = [
    'Oil Change',
    'Brake Pads (Front)',
    'Brake Pads (Rear)',
    'Brake Rotors (Front)',
    'Brake Rotors (Rear)',
    'Transmission Fluid',
    'Brake Fluid',
    'Tire Rotation',
    'Tire Balance',
    'Air Filter',
    'Coolant Flush',
    'Spark Plugs'
  ];

  // Mock VIN decoder function (in real app, this would call an API)
  const decodeVIN = (vin) => {
    // Simple mock - in reality you'd use NHTSA API or similar
    const mockData = {
      '1HGCM82633A123456': { year: '2023', make: 'Honda', model: 'Accord' },
      '1FTFW1ET5DFC12345': { year: '2022', make: 'Ford', model: 'F-150' },
      '1G1YY22G965123456': { year: '2021', make: 'Chevrolet', model: 'Camaro' }
    };
    return mockData[vin] || null;
  };

  // Camera functions
  const startCamera = async (type) => {
    setCameraType(type);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Unable to access camera. Please enter information manually.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      
      // Mock scanning result
      if (cameraType === 'vin') {
        const mockVIN = '1HGCM82633A123456';
        const decodedData = decodeVIN(mockVIN);
        if (decodedData) {
          setNewVehicle({
            ...newVehicle,
            vin: mockVIN,
            ...decodedData
          });
        }
      } else if (cameraType === 'odometer') {
        // Mock odometer reading
        const mockMileage = Math.floor(Math.random() * 100000) + 10000;
        if (currentView === 'addVehicle') {
          setNewVehicle({ ...newVehicle, currentMileage: mockMileage.toString() });
        } else {
          setMaintenanceForm({ ...maintenanceForm, mileage: mockMileage.toString() });
        }
      }
      
      stopCamera();
    }
  };

  const addVehicle = () => {
    if (newVehicle.vin && newVehicle.year && newVehicle.make && newVehicle.model && newVehicle.currentMileage) {
      const vehicle = {
        id: Date.now(),
        ...newVehicle,
        maintenanceRecords: []
      };
      setVehicles([...vehicles, vehicle]);
      setNewVehicle({ vin: '', year: '', make: '', model: '', currentMileage: '' });
      setCurrentView('garage');
    }
  };

  const addMaintenanceRecord = () => {
    if (maintenanceForm.mileage && maintenanceForm.serviceType) {
      const record = {
        id: Date.now(),
        date: new Date().toLocaleDateString(),
        ...maintenanceForm
      };
      
      const updatedVehicles = vehicles.map(vehicle => {
        if (vehicle.id === selectedVehicle.id) {
          return {
            ...vehicle,
            currentMileage: maintenanceForm.mileage,
            maintenanceRecords: [...vehicle.maintenanceRecords, record]
          };
        }
        return vehicle;
      });
      
      setVehicles(updatedVehicles);
      setSelectedVehicle({
        ...selectedVehicle,
        currentMileage: maintenanceForm.mileage,
        maintenanceRecords: [...selectedVehicle.maintenanceRecords, record]
      });
      
      // Schedule reminder if date is set
      if (maintenanceForm.reminderDate) {
        scheduleReminder(maintenanceForm.serviceType, maintenanceForm.reminderDate);
      }
      
      setMaintenanceForm({
        mileage: '',
        serviceType: '',
        productUsed: '',
        notes: '',
        reminderDate: '',
        reminderInterval: '3'
      });
    }
  };

  const scheduleReminder = (serviceType, date) => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          const reminderDate = new Date(date);
          const now = new Date();
          const timeDiff = reminderDate.getTime() - now.getTime();
          
          if (timeDiff > 0) {
            setTimeout(() => {
              new Notification('Vehicle Maintenance Reminder', {
                body: `Time for ${serviceType} on your ${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`,
                icon: '🚗'
              });
            }, timeDiff);
          }
        }
      });
    }
  };

  const updateCurrentDate = () => {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setMonth(today.getMonth() + parseInt(maintenanceForm.reminderInterval));
    setMaintenanceForm({
      ...maintenanceForm,
      reminderDate: futureDate.toISOString().split('T')[0]
    });
  };

  // Main Garage View
  const renderGarageView = () => (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            {isEditingGarageName ? (
              <div className="flex items-center space-x-2 flex-1">
                <input
                  type="text"
                  value={garageName}
                  onChange={(e) => setGarageName(e.target.value)}
                  className="text-2xl font-bold text-gray-800 bg-transparent border-b-2 border-blue-500 outline-none flex-1"
                  autoFocus
                />
                <button
                  onClick={() => setIsEditingGarageName(false)}
                  className="text-green-600 hover:text-green-700"
                >
                  <Save size={20} />
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-800">{garageName}</h1>
                <button
                  onClick={() => setIsEditingGarageName(true)}
                  className="text-gray-500 hover:text-blue-600"
                >
                  <Edit2 size={20} />
                </button>
              </>
            )}
          </div>
          
          {vehicles.length === 0 ? (
            <div className="text-center py-8">
              <Car size={64} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-6">No vehicles in your garage yet</p>
              <button
                onClick={() => setCurrentView('addVehicle')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center space-x-2 mx-auto"
              >
                <Plus size={20} />
                <span>Add Vehicle</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {vehicles.map(vehicle => (
                <div
                  key={vehicle.id}
                  onClick={() => {
                    setSelectedVehicle(vehicle);
                    setCurrentView('vehicleDetail');
                  }}
                  className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Car size={24} className="text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {parseInt(vehicle.currentMileage).toLocaleString()} miles
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setCurrentView('addVehicle')}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
              >
                <Plus size={20} />
                <span>Add Another Vehicle</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Add Vehicle View
  const renderAddVehicleView = () => (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">Add Vehicle</h2>
            <button
              onClick={() => setCurrentView('garage')}
              className="text-gray-500 hover:text-red-600"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">VIN</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newVehicle.vin}
                  onChange={(e) => setNewVehicle({ ...newVehicle, vin: e.target.value })}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter VIN manually"
                />
                <button
                  onClick={() => startCamera('vin')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <Camera size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                <input
                  type="text"
                  value={newVehicle.year}
                  onChange={(e) => setNewVehicle({ ...newVehicle, year: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Make</label>
                <input
                  type="text"
                  value={newVehicle.make}
                  onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                <input
                  type="text"
                  value={newVehicle.model}
                  onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Mileage</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={newVehicle.currentMileage}
                  onChange={(e) => setNewVehicle({ ...newVehicle, currentMileage: e.target.value })}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter mileage"
                />
                <button
                  onClick={() => startCamera('odometer')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <Camera size={20} />
                </button>
              </div>
            </div>

            <button
              onClick={addVehicle}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium"
            >
              Add Vehicle
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Vehicle Detail View
  const renderVehicleDetailView = () => (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
            </h2>
            <button
              onClick={() => setCurrentView('garage')}
              className="text-gray-500 hover:text-red-600"
            >
              <X size={24} />
            </button>
          </div>
          <p className="text-gray-600 mb-6">
            Current Mileage: {parseInt(selectedVehicle.currentMileage).toLocaleString()} miles
          </p>

          {/* Add Maintenance Record Form */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Wrench size={20} className="mr-2" />
              Add Maintenance Record
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Mileage</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={maintenanceForm.mileage}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, mileage: e.target.value })}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter current mileage"
                  />
                  <button
                    onClick={() => startCamera('odometer')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    <Camera size={20} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
                <select
                  value={maintenanceForm.serviceType}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, serviceType: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select service type</option>
                  {serviceTypes.map(service => (
                    <option key={service} value={service}>{service}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Used</label>
                <input
                  type="text"
                  value={maintenanceForm.productUsed}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, productUsed: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Mobil 1 5W-30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Bell size={16} className="mr-1" />
                  Reminder Settings
                </label>
                <div className="flex space-x-2">
                  <select
                    value={maintenanceForm.reminderInterval}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, reminderInterval: e.target.value })}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1">1 month</option>
                    <option value="2">2 months</option>
                    <option value="3">3 months</option>
                    <option value="6">6 months</option>
                    <option value="12">12 months</option>
                  </select>
                  <button
                    onClick={updateCurrentDate}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Set Date
                  </button>
                </div>
                {maintenanceForm.reminderDate && (
                  <input
                    type="date"
                    value={maintenanceForm.reminderDate}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, reminderDate: e.target.value })}
                    className="w-full mt-2 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <FileText size={16} className="mr-1" />
                  Notes
                </label>
                <textarea
                  value={maintenanceForm.notes}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Tools used, torque specs, tips, etc."
                />
              </div>

              <button
                onClick={addMaintenanceRecord}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium"
              >
                Add Maintenance Record
              </button>
            </div>
          </div>
        </div>

        {/* Maintenance History */}
        {selectedVehicle.maintenanceRecords.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Maintenance History</h3>
            <div className="space-y-4">
              {selectedVehicle.maintenanceRecords.map(record => (
                <div key={record.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-800">{record.serviceType}</h4>
                    <span className="text-sm text-gray-600">{record.date}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    Mileage: {parseInt(record.mileage).toLocaleString()} miles
                  </p>
                  {record.productUsed && (
                    <p className="text-sm text-gray-600 mb-1">Product: {record.productUsed}</p>
                  )}
                  {record.notes && (
                    <p className="text-sm text-gray-600">{record.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Camera Modal
  const renderCameraModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">
            {cameraType === 'vin' ? 'Scan VIN Barcode' : 'Scan Odometer'}
          </h3>
          <button onClick={stopCamera} className="text-red-600">
            <X size={24} />
          </button>
        </div>
        
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full rounded-lg mb-4"
        />
        <canvas ref={canvasRef} className="hidden" />
        
        <div className="flex space-x-4">
          <button
            onClick={captureImage}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
          >
            Capture
          </button>
          <button
            onClick={stopCamera}
            className="flex-1 bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative">
      {currentView === 'garage' && renderGarageView()}
      {currentView === 'addVehicle' && renderAddVehicleView()}
      {currentView === 'vehicleDetail' && renderVehicleDetailView()}
      {showCamera && renderCameraModal()}
    </div>
  );
};

export default VehicleMaintenanceTracker;
