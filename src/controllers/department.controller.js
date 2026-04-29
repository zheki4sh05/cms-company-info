const departmentService = require("../services/department.service");

async function list(req, res, next) {
  try {
    const data = await departmentService.listDepartments(req.params.companyId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const data = await departmentService.getDepartmentById(
      req.authContext.userId,
      req.params.id
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function patchAtRoot(req, res, next) {
  try {
    const data = await departmentService.patchDepartmentById(
      req.authContext.userId,
      req.params.id,
      req.body
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function destroyAtRoot(req, res, next) {
  try {
    const data = await departmentService.deleteDepartmentById(
      req.authContext.userId,
      req.params.id
    );
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

async function transfer(req, res, next) {
  try {
    const data = await departmentService.transferEmployee(
      req.authContext.userId,
      req.body
    );
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

async function assignManager(req, res, next) {
  try {
    const data = await departmentService.setDepartmentManager(
      req.authContext.userId,
      req.params.departmentId,
      req.body
    );
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

async function assignSupervisor(req, res, next) {
  try {
    const data = await departmentService.setDepartmentSupervisor(
      req.authContext.userId,
      req.params.departmentId,
      req.headers.companyid,
      req.body
    );
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = await departmentService.createDepartment(
      req.params.companyId,
      req.body
    );
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

async function createAtRoot(req, res, next) {
  try {
    const companyId =
      typeof req.body?.companyId === "string"
        ? req.body.companyId.trim()
        : "";
    const data = await departmentService.createDepartment(companyId, req.body);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = await departmentService.updateDepartment(
      req.params.companyId,
      req.params.departmentId,
      req.body
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function destroy(req, res, next) {
  try {
    await departmentService.deleteDepartment(
      req.params.companyId,
      req.params.departmentId
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function addMember(req, res, next) {
  try {
    const data = await departmentService.addMember(
      req.params.companyId,
      req.params.departmentId,
      req.body
    );
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

async function removeMember(req, res, next) {
  try {
    await departmentService.removeMember(
      req.params.companyId,
      req.params.departmentId,
      req.params.employeeId
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  getOne,
  patchAtRoot,
  destroyAtRoot,
  transfer,
  assignManager,
  assignSupervisor,
  create,
  createAtRoot,
  update,
  destroy,
  addMember,
  removeMember,
};
